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
            include: { assignedVehicle: true, tenant: true, store: true, customRole: true },
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
                customRoleId: user.customRoleId,
                customRoleName: user.customRole?.name || null,
                permissions: user.customRole?.permissions || null,
                portalType: user.customRole?.portalType || null,
                attendanceEnabled: user.attendanceEnabled,
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

// @desc    Register a new user (Tenant Owner)
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
    try {
        const { name, surname, mobile, gender, password, email } = req.body;

        if (!mobile || !password || !name) {
            res.status(400);
            throw new Error('Please provide name, mobile and password');
        }

        const userExists = await prisma.user.findUnique({ where: { mobile } });
        if (userExists) {
            res.status(400);
            throw new Error('User with this mobile number already exists');
        }

        // Generate a unique tenant code
        const tenantCount = await prisma.tenant.count();
        const tenantCode = `VK${String(tenantCount + 1).padStart(3, '0')}`;

        // Create Tenant first
        const tenant = await prisma.tenant.create({
            data: {
                name: `${name}'s Business`,
                code: tenantCode,
                contactPhone: mobile,
                contactEmail: email || null,
            }
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create User
        const user = await prisma.user.create({
            data: {
                name: `${name} ${surname || ''}`.trim(),
                mobile,
                email: email || `${mobile}@villagkart.com`, // Email is unique in schema, provide fallback
                password: hashedPassword,
                role: 'TENANT_OWNER',
                tenantId: tenant.id,
                status: 'ACTIVE'
            },
            include: { tenant: true }
        });

        const token = generateToken(user.id, user.role, null, user.tenantId);

        res.status(201).json({
            id: user.id,
            tenantId: user.tenantId,
            tenantName: user.tenant?.name,
            name: user.name,
            mobile: user.mobile,
            role: user.role,
            token: token,
        });

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
                assignedVehicle: true,
                customRole: true,
                documents: true
            }
        });

        if (user) {
            res.json({
                ...user,
                tenantName: user.tenant?.name,
                storeName: user.store?.name,
                customRoleName: user.customRole?.name || null,
                permissions: user.customRole?.permissions || null,
                portalType: user.customRole?.portalType || null,
            });
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

import { uploadToSupabase } from '../utils/supabaseService.js';
// jsjsjs
// @desc    Upload document for current user
// @route   POST /api/auth/me/documents
// @access  Private
export const uploadMyDocument = async (req, res, next) => {
    try {
        const { type, documentNumber } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileUrl = await uploadToSupabase(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            'users',
            'kyc'
        );

        if (!fileUrl) {
            return res.status(500).json({ message: 'Failed to upload to cloud storage' });
        }

        const document = await prisma.userDocument.create({
            data: {
                userId: req.user.id,
                type,
                documentNumber,
                fileUrl,
                status: 'PENDING'
            }
        });

        res.status(201).json({ message: 'Document uploaded successfully', document });
    } catch (error) {
        next(error);
    }
};
