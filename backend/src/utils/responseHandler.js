export const successResponse = (res, data, message = "Thành công") => {
    return res.status(200).json({ success: true, message, data });
  };
  
  export const errorResponse = (res, message = "Lỗi xảy ra", statusCode = 500) => {
    return res.status(statusCode).json({ success: false, message });
  };
  