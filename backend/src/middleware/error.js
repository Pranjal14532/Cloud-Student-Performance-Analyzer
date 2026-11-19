export function notFound(req, res) {
  res.status(404).json({ message: "Endpoint not found" });
}

export function errorHandler(error, req, res, next) {
  console.error(error);
  if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Duplicate record" });
  res.status(error.status || 500).json({ message: error.message || "Internal server error" });
}
