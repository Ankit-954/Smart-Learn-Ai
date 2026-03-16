import multer from "multer";
import { v4 as uuid } from "uuid";

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads");
  },
  filename(req, file, cb) {
    const id = uuid();

    const extName = file.originalname.split(".").pop();

    const fileName = `${id}.${extName}`;

    cb(null, fileName);
  },
});

export const uploadFiles = multer({ storage }).single("file");

const imageFileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

export const uploadReviewImage = multer({
  storage,
  limits: { fileSize: 30 * 1024 },
  fileFilter: imageFileFilter,
}).single("image");

const lectureVideoFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed for lectures"), false);
  }
};

export const uploadCourseImage = multer({
  storage,
  fileFilter: imageFileFilter,
}).single("file");

export const uploadLectureVideo = multer({
  storage,
  fileFilter: lectureVideoFilter,
}).single("file");

export const uploadProfileImage = multer({
  storage,
  fileFilter: imageFileFilter,
}).single("photo");

export const uploadBlogImage = multer({
  storage,
  fileFilter: imageFileFilter,
}).single("image");

export const uploadAboutImage = multer({
  storage,
  fileFilter: imageFileFilter,
}).single("image");
