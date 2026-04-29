import prisma from '../utils/prisma.js';
import { format } from 'date-fns';

/**
 * Late Entry Rules Engine
 * Handles detection, recording, and penalty application for late check-ins.
 */
class LateEntryEngine {
  /**
   * Detect and record late entry if applicable
   * @param {string} userId 
   * @param {Date} checkinTime 
   * @param {string} date - YYYY-MM-DD
   */
  async detectAndRecord(userId, checkinTime, date) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { tenant: true }
      });

      if (!user) throw new Error('User not found');

      const tenantId = user.tenantId;
      const storeId = user.storeId;

      // 1. Get Shift Configuration
      const shiftConfig = await this._getShiftConfig(tenantId, storeId, user);
      if (!shiftConfig || !shiftConfig.startTime) {
        console.log(`No shift config found for user ${userId}, skipping late detection.`);
        return null;
      }

      const shiftStartTimeStr = shiftConfig.startTime; // e.g., "09:00"
      const [shiftHour, shiftMin] = shiftStartTimeStr.split(':').map(Number);
      
      const shiftStartTime = new Date(checkinTime);
      shiftStartTime.setHours(shiftHour, shiftMin, 0, 0);

      // 2. Get Late Entry Config
      const config = await this._getLateEntryConfig(tenantId, storeId, user);
      const graceMins = config ? config.graceMins : 10; // Default 10 mins

      const allowedTime = new Date(shiftStartTime.getTime() + graceMins * 60000);

      if (checkinTime <= allowedTime) {
        return { isLate: false, graceApplied: graceMins };
      }

      // 3. It is a Late Entry
      const lateMinutes = Math.floor((checkinTime - shiftStartTime) / 60000);
      const resetCycle = config?.rules?.resetCycle || 'MONTHLY';
      const monthlyCount = await this._getMonthlyLateCount(userId, date, resetCycle);

      let penaltyApplied = 'NONE';
      let penaltyValue = 0;

      if (config && config.rules) {
        ({ penaltyApplied, penaltyValue } = this._evaluatePenalty(config, lateMinutes, monthlyCount + 1));
      }

      // 4. Record Late Entry
      const lateEntry = await prisma.lateEntry.create({
        data: {
          userId,
          tenantId,
          storeId,
          attendanceId: (await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } })).id,
          configId: config ? config.id : null,
          date,
          shiftStart: shiftStartTimeStr,
          checkinTime,
          lateMinutes,
          monthlyCount: monthlyCount + 1,
          penaltyApplied,
          penaltyValue
        }
      });

      // 5. Apply Penalty (Deduct Leave/LOP)
      if (penaltyValue > 0) {
        await this._applyPenaltyToBalance(userId, tenantId, date, penaltyApplied, penaltyValue);
      }

      // 6. Update Attendance
      await prisma.attendance.update({
        where: { userId_date: { userId, date } },
        data: {
          isLate: true,
          lateMinutes,
          graceApplied: graceMins,
          shiftStartTime: shiftStartTimeStr,
          lateEntryConfigId: config ? config.id : null
        }
      });

      // TODO: Notify Employee & Manager (Notification Service)

      return lateEntry;
    } catch (error) {
      console.error('LateEntryEngine error:', error);
      return null;
    }
  }

  async _getShiftConfig(tenantId, storeId, user) {
    // Try store settings first
    let settings = await prisma.businessSettings.findFirst({
      where: { tenantId, storeId }
    });

    if (!settings || !settings.shifts) {
      settings = await prisma.businessSettings.findFirst({
        where: { tenantId, storeId: null }
      });
    }

    if (!settings || !settings.shifts) return null;

    const shifts = Array.isArray(settings.shifts) ? settings.shifts : [];
    if (shifts.length === 0) return null;

    // Pick the shift that matches the current time best
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Find the shift where startTime <= currentTime <= endTime
    const activeShift = shifts.find(s => {
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = (s.endTime || '23:59').split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      
      return currentMinutes >= startMin - 60 && currentMinutes <= endMin; // Allow 1 hour buffer before start
    });

    return activeShift || shifts[0];
  }

  async _getLateEntryConfig(tenantId, storeId, user) {
    // Priority: ROLE -> DEPARTMENT -> STORE -> COMPANY
    const configs = await prisma.lateEntryConfig.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { scope: 'ROLE', scopeValue: user.role },
          { scope: 'DEPARTMENT', scopeValue: user.portalType },
          { scope: 'STORE', storeId: storeId },
          { scope: 'COMPANY', storeId: null }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    // Return the most specific one
    const roleConfig = configs.find(c => c.scope === 'ROLE');
    if (roleConfig) return roleConfig;

    const deptConfig = configs.find(c => c.scope === 'DEPARTMENT');
    if (deptConfig) return deptConfig;
    
    const storeConfig = configs.find(c => c.scope === 'STORE');
    if (storeConfig) return storeConfig;

    return configs.find(c => c.scope === 'COMPANY') || null;
  }

  async _getMonthlyLateCount(userId, date, resetCycle = 'MONTHLY') {
    const now = new Date(date);
    let startDate;

    if (resetCycle === 'QUARTERLY') {
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
    } else if (resetCycle === 'YEARLY') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // Default: Monthly
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const count = await prisma.lateEntry.count({
      where: {
        userId,
        createdAt: { gte: startDate },
        isWaived: false
      }
    });
    return count;
  }

  _evaluatePenalty(config, lateMinutes, count) {
    const rules = config.rules;
    if (!Array.isArray(rules)) return { penaltyApplied: 'NONE', penaltyValue: 0 };

    // Support PROGRESSIVE logic: multiple rules can exist. 
    // We pick the most severe penalty that applies.
    
    let matchedRule = null;

    if (config.penaltyType === 'COUNT' || config.penaltyType === 'PROGRESSIVE') {
      const countRule = [...rules]
        .filter(r => r.threshold !== undefined)
        .sort((a, b) => b.threshold - a.threshold)
        .find(r => count >= r.threshold);
      
      if (countRule) matchedRule = countRule;
    } 
    
    // If no count rule matched, or if we want to check time-based as well
    if (config.penaltyType === 'TIME' || (config.penaltyType === 'PROGRESSIVE' && !matchedRule)) {
      const timeRule = [...rules]
        .filter(r => r.minMins !== undefined)
        .sort((a, b) => b.minMins - a.minMins)
        .find(r => lateMinutes >= r.minMins);
      
      if (timeRule) {
        // If we already have a count rule, pick the one with higher penalty value
        if (!matchedRule || timeRule.value > matchedRule.value) {
          matchedRule = timeRule;
        }
      }
    }
    
    if (matchedRule) {
      return { penaltyApplied: matchedRule.penalty, penaltyValue: matchedRule.value };
    }
    
    return { penaltyApplied: 'NONE', penaltyValue: 0 };
  }

  async _applyPenaltyToBalance(userId, tenantId, date, penalty, value) {
    const month = date.substring(0, 7);
    
    const balance = await prisma.leaveBalance.upsert({
      where: { userId_month: { userId, month } },
      update: {},
      create: {
        userId,
        tenantId,
        month,
        annualLeave: 0,
        sickLeave: 0,
        casualLeave: 0
      }
    });

    const updateData = {};
    if (penalty === 'HALF_DAY') {
      updateData.halfDays = { increment: value };
    } else if (penalty === 'FULL_DAY' || penalty === 'LOP') {
      updateData.lopDays = { increment: value };
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: updateData
      });
    }
  }
}

export default new LateEntryEngine();
