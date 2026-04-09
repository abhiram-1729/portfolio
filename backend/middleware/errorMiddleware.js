import fs from 'fs';
import path from 'path';

export const errorHandler = (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const errorLog = `[${timestamp}] ${err.message}\n${err.stack}\n\n`;
    
    try {
        fs.appendFileSync('error.log', errorLog);
    } catch (e) {
        console.error('Failed to write to error.log', e);
    }

    console.error(`[Error] ${err.message}`, err.stack);
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};


