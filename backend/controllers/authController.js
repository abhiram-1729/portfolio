import prisma from '../utils/prisma.js';
import bcrypt from 'bcryptjs';
import generateToken from '../utils/generateToken.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
    try {
        const { mobile, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { mobile },
            include: { assignedVehicle: true },
        });

        if (!user) {
            res.status(401);
            throw new Error('Invalid mobile or password');
        }

        if (user.status === 'SUSPENDED') {
            res.status(403);
            throw new Error('Account is suspended. Please contact your administrator.');
        }

        if (await bcrypt.compare(password, user.password)) {
            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                assignedVehicle: user.assignedVehicle,
                token: generateToken(user.id),
            });
        } else {
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
            select: {
                id: true,
                name: true,
                email: true,
                mobile: true,
                role: true,
                assignedVehicle: true,
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
