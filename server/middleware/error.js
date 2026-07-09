export const notFound = (req, res, next) => {
  res.status(404).json({ message: `Not found - ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  console.error(err.stack || err.message);
  res.status(status).json({
    message: err.message || "Server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
