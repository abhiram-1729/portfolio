import prisma from '../../utils/prisma.js';

export const createVillage = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) {
            res.status(400);
            throw new Error('Village name is required');
        }
        const village = await prisma.village.create({ data: { name } });
        res.status(201).json(village);
    } catch (error) {
        if (error.code === 'P2002') {
            res.status(400);
            return next(new Error('Village already exists'));
        }
        next(error);
    }
};

export const getVillages = async (req, res, next) => {
    try {
        const villages = await prisma.village.findMany({ orderBy: { name: 'asc' } });
        res.json(villages);
    } catch (error) {
        next(error);
    }
};

export const updateVillage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const village = await prisma.village.update({ where: { id }, data: { name } });
        res.json(village);
    } catch (error) {
        next(error);
    }
};

export const deleteVillage = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.village.delete({ where: { id } });
        res.json({ message: 'Village deleted' });
    } catch (error) {
        next(error);
    }
};
