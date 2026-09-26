export function successResponse<T>(data: T) {
  return {
    success: true as const,
    data,
  };
}

export function errorResponse(message: string, statusCode = 400) {
  return {
    success: false as const,
    error: {
      message,
      statusCode,
    },
  };
}