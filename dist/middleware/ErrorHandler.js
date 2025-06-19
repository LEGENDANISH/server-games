"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(server) {
    return (err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({
            error: "Something went wrong!",
            details: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    };
}
