import jwt from 'jsonwebtoken';

const generateToken = (id, role, assignedVehicleId, tenantId) => {
    return jwt.sign({ id, role, assignedVehicleId, tenantId }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

export default generateToken;
