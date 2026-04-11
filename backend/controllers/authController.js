import prisma from '../utils/prisma.js';
import bcrypt from 'bcryptjs';
import generateToken from '../utils/generateToken.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
    try {
        const { mobile, password } = req.body;
        console.log(`[DEBUG] Login attempt: ${mobile}`);

        const user = await prisma.user.findUnique({
            where: { mobile },
            include: { assignedVehicle: true, tenant: true, store: true },
        });
        console.log(`[DEBUG] User found: ${!!user}, Status: ${user?.status}, Role: ${user?.role}`);

        if (!user) {
            console.log('[DEBUG] Login failed: User not found');
            res.status(401);
            throw new Error('Invalid mobile or password');
        }

        if (user.status === 'SUSPENDED') {
            console.log('[DEBUG] Login failed: User suspended');
            return res.status(403).json({ 
                success: false, 
                message: 'Account is suspended. Please contact your administrator.' 
            });
        }

        if (user.role === 'SALES_AGENT' && user.assignedVehicle && user.assignedVehicle.status === false) {
            console.log('[DEBUG] Login failed: Vehicle inactive');
            return res.status(403).json({ 
                success: false, 
                message: `Your assigned vehicle (${user.assignedVehicle.vehicleNumber}) is currently INACTIVE. Access denied.` 
            });
        }

        console.log('[DEBUG] Comparing password...');
        if (await bcrypt.compare(password, user.password)) {
            console.log('[DEBUG] Password matched. Generating token...');
            const token = generateToken(user.id, user.role, user.assignedVehicleId, user.tenantId);
            console.log('[DEBUG] Token generated successfully');
            
            res.json({
                id: user.id,
                tenantId: user.tenantId,
                tenantName: user.tenant?.name,
                storeId: user.storeId,
                storeName: user.store?.name,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                assignedVehicleId: user.assignedVehicleId,
                assignedVehicle: user.assignedVehicle,
                token: token,
            });
        } else {
            console.log('[DEBUG] Login failed: Password mismatch');
            res.status(401);
            throw new Error('Invalid mobile or password');
        }

    } catch (error) {
        next(error);
    }
};

// @desc    Logout user / clear cookie or token (using token so frontend clears it)
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = async (req, res) => {
    res.json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/auth/me (or /api/profile)
// @access  Private
export const getUserProfile = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                tenant: { select: { name: true, logo: true } },
                store: { select: { name: true, code: true } },
                assignedVehicle: true
            }
        });

        if (user) {
            res.json(user);
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Update user password
// @route   PUT /api/auth/password
// @access  Private
export const updatePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify old password
        if (!(await bcrypt.compare(oldPassword, user.password))) {
            return res.status(401).json({ message: 'Incorrect old password' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};
