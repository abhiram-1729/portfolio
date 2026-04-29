import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';

export default function AgentPerformanceReport() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getAgentPerformance({ storeId });
      setReportData(res.data);
    } catch (error) {
      toast.error('Failed to load agent performance data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  return (
    <ReportLayout title="Agent Performance" icon={Users} activeTab="agent-performance" reportData={reportData} isLoading={isLoading}>
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-10">
              <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Agent Performance vs Targets</h3>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-50 text-cyan-600 text-[10px] font-black uppercase tracking-widest">
                  <Users size={14} /> Active Agents
              </div>
          </div>
          <div className="space-y-8">
              {Array.isArray(reportData) && reportData.map((agent, idx) => (
                  <div key={idx} className="space-y-3 p-6 rounded-[1.5rem] bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                      <div className="flex justify-between items-end">
                          <div>
                              <h4 className="text-base font-black text-gray-900">{agent.name}</h4>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">
                                  Today: ₹{(agent.totalSales || 0).toLocaleString()} <span className="opacity-40">/ Goal: ₹{(agent.dailyTarget || 0).toLocaleString()}</span>
                              </p>
                          </div>
                          <div className="text-right">
                              <span className={`text-xl font-black tracking-tighter ${agent.percentage >= 100 ? 'text-emerald-600' : 'text-orange-500'}`}>
                                  {agent.percentage}%
                              </span>
                          </div>
                      </div>
                      <div className="h-2.5 bg-white rounded-full overflow-hidden border border-gray-100 p-0.5 shadow-inner">
                          <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(agent.percentage, 100)}%` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className={`h-full rounded-full ${agent.percentage >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-orange-400 to-orange-500'}`}
                          />
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </ReportLayout>
  );
}
