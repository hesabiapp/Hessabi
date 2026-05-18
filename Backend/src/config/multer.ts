import multer from "multer";
import path from "path";

const uploadPath = 'src/productsImages/';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const photoType = path.extname(file.originalname);
        const photoName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${photoType}`;
        cb(null, photoName);
    }
});

const upload = multer({ storage });

export default upload;