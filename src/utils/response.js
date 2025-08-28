exports.sendSuccessResponse = (res, message, data = {}) => {
    return res.status(200).json({
        status: 'success',
        message,
        data
    });
};

exports.sendErrorResponse = (res, message, statusCode = 500, error = null) => {
    return res.status(statusCode).json({
        status: 'error',
        message,
        error
    });
};
