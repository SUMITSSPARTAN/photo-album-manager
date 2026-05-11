import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith("image/jpeg") && !file.mimetype.startsWith("image/png")) {
            callback(new Error("Only image with extension .jpg or .png uploads are allowed"));
            return;
        }
        callback(null, true);
    }
});