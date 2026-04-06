import jwt from 'jsonwebtoken';

const generateToken = (id, role, assignedVehicleId) => {
    return jwt.sign({ id, role, assignedVehicleId }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};


export default generateToken;
