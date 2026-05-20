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
                tenantLogo: user.tenant?.logo || null,
                storeId: user.storeId,
                storeName: user.store?.name,
                storeLogo: user.store?.logo || null,
                name: user.name,
                avatar: user.avatar,
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
                store: { select: { name: true, code: true, logo: true } },
                assignedVehicle: true,
                customRole: true,
                documents: true
            }
        });

        if (user) {
            res.json({
                ...user,
                tenantName: user.tenant?.name,
                tenantLogo: user.tenant?.logo || null,
                storeName: user.store?.name,
                storeLogo: user.store?.logo || null,
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
<<<<<<< HEAD

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

// @desc    Update user profile (name, avatar)
// @route   PUT /api/auth/me
// @access  Private
export const updateUserProfile = async (req, res, next) => {
    try {
        console.log('[updateUserProfile] Request received. Body:', req.body, 'File present:', !!req.file);
        if (!req.user || !req.user.id) {
            console.error('[updateUserProfile] req.user is missing or invalid');
            return res.status(401).json({ message: 'User reference missing from session request' });
        }

        const { name } = req.body;
        const updateData = { updatedAt: new Date() };

        if (name !== undefined && name.trim() !== '') {
            updateData.name = name.trim();
        }

        if (req.file) {
            console.log(`[updateUserProfile] Uploading avatar: ${req.file.originalname} (${req.file.mimetype})`);
            try {
                const avatarUrl = await uploadToSupabase(
                    req.file.buffer,
                    req.file.originalname,
                    req.file.mimetype,
                    'users',
                    'avatars'
                );
                console.log('[updateUserProfile] Avatar uploaded successfully to URL:', avatarUrl);
                if (avatarUrl) {
                    updateData.avatar = avatarUrl;
                }
            } catch (uploadErr) {
                console.error('[updateUserProfile] Upload failed:', uploadErr.message);
                // Keep processing name even if file upload triggers a non-fatal storage block
            }
        }

        console.log('[updateUserProfile] Executing DB update for user ID:', req.user.id, 'with data:', updateData);
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: {
                id: true,
                name: true,
                avatar: true,
                email: true,
                mobile: true,
                role: true,
            }
        });

        console.log('[updateUserProfile] Update successful:', updatedUser);
        res.json({ success: true, data: updatedUser, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('[updateUserProfile Final Error]:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error updating profile' });
    }
};

// @desc    Update business profile (store/tenant name and logo)
// @route   PUT /api/auth/business
// @access  Private
export const updateBusinessProfile = async (req, res, next) => {
    try {
        console.log('[updateBusinessProfile] Request received. Body:', req.body, 'File present:', !!req.file);
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { store: true, tenant: true }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User reference missing' });
        }

        const { businessName } = req.body;
        let logoUrl = null;

        if (req.file) {
            console.log(`[updateBusinessProfile] Uploading logo: ${req.file.originalname}`);
            try {
                logoUrl = await uploadToSupabase(
                    req.file.buffer,
                    req.file.originalname,
                    req.file.mimetype,
                    'business',
                    'logos'
                );
                console.log('[updateBusinessProfile] Logo uploaded successfully:', logoUrl);
            } catch (err) {
                console.error('[updateBusinessProfile] Logo upload failed:', err.message);
            }
        }

        let updatedData = null;

        if (user.storeId) {
            const updatePayload = { updatedAt: new Date() };
            if (businessName !== undefined && businessName.trim() !== '') {
                updatePayload.name = businessName.trim();
            }
            if (logoUrl) {
                updatePayload.logo = logoUrl;
            }
            updatedData = await prisma.store.update({
                where: { id: user.storeId },
                data: updatePayload
            });
        } else if (user.tenantId) {
            const updatePayload = { updatedAt: new Date() };
            if (businessName !== undefined && businessName.trim() !== '') {
                updatePayload.name = businessName.trim();
            }
            if (logoUrl) {
                updatePayload.logo = logoUrl;
            }
            updatedData = await prisma.tenant.update({
                where: { id: user.tenantId },
                data: updatePayload
            });
        }

        res.json({
            success: true,
            data: updatedData,
            message: 'Business profile customized successfully'
        });
    } catch (error) {
        console.error('[updateBusinessProfile Error]:', error.message || error);
        if (error.stack) {
            console.error('[updateBusinessProfile Stack]:', error.stack);
        }
        res.status(500).json({ success: false, message: error.message || 'Internal server error updating business profile' });
    }
};
=======
// comment
>>>>>>> cicd
