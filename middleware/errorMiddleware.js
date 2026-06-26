// Global error handling middleware
const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);

    res.json({
        success: false,
        message: err.message,
        data: process.env.NODE_ENV === 'production' ? null : { stack: err.stack }
    });
};

// Fallback for 404 Not Found routes
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = {
    errorHandler,
    notFound,
};
