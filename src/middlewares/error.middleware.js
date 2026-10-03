const errorHandler = (err, req, res, next) => {
    console.error("ERROR:", err.message);

    const statusCode = err.statusCode || 500;

    return res.status(statusCode).json({
        success: err.success || false,
        message: err.message || "Internal Server Error",
        errors: err.errors || [],
    });
};

export { errorHandler };