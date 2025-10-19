const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use memory storage for all uploads in serverless environment
const storageCategory = multer.memoryStorage();
const storageProduct = multer.memoryStorage();
const storagePoster = multer.memoryStorage();

// Helper function to ensure directory exists (for local development only)
function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error) {
    console.warn(`Could not create directory ${dirPath}:`, error.message);
    // In serverless environments, this is expected to fail
  }
}

// File filter function (accept jpg/png by mime or extension; allow octet-stream if ext ok)
const fileFilter = (req, file, cb) => {
  try {
    const filetypes = /jpeg|jpg|png/;
    const originalName = (file.originalname || '').toLowerCase();
    const ext = path.extname(originalName);
    const extOk = filetypes.test(ext);
    const mime = (file.mimetype || '').toLowerCase();
    const mimeOk = filetypes.test(mime);

    // Some Android uploads report application/octet-stream; trust extension in that case
    const isOctetStream = mime === 'application/octet-stream' || mime === '';

    if ((extOk && (mimeOk || isOctetStream))) {
      return cb(null, true);
    }
    return cb(new Error('Error: only .jpeg, .jpg, .png files are allowed!'));
  } catch (e) {
    return cb(new Error('Error: invalid upload'));
  }
};

// Category upload (memory storage)
const uploadCategory = multer({
  storage: storageCategory,
  limits: {
    fileSize: 1024 * 1024 * 5 // limit filesize to 5MB
  },
  fileFilter: fileFilter
});

// Product upload (memory storage)
const uploadProduct = multer({
  storage: storageProduct,
  limits: {
    fileSize: 1024 * 1024 * 5 // limit filesize to 5MB
  },
  fileFilter: fileFilter
});

// Poster upload (memory storage)
const uploadPosters = multer({
  storage: storagePoster,
  limits: {
    fileSize: 1024 * 1024 * 5 // limit filesize to 5MB
  },
  fileFilter: fileFilter
});

// Legacy disk storage for local development (commented out for serverless)
/*
const storageProductDisk = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadPath = './public/products';
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (extname) {
      cb(null, Date.now() + "_" + file.originalname);
    } else {
      cb("Error: only .jpeg, .jpg, .png files are allowed!");
    }
  }
});

const storagePosterDisk = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadPath = './public/posters';
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (extname) {
      cb(null, Date.now() + "_" + file.originalname);
    } else {
      cb("Error: only .jpeg, .jpg, .png files are allowed!");
    }
  }
});
*/

module.exports = {
  uploadCategory,
  uploadProduct,
  uploadPosters,
  // Legacy exports for local development
  // uploadProductDisk: multer({ storage: storageProductDisk, limits: { fileSize: 1024 * 1024 * 5 } }),
  // uploadPostersDisk: multer({ storage: storagePosterDisk, limits: { fileSize: 1024 * 1024 * 5 } })
};
