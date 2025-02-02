const express = require('express')
const router = express.Router()
const multer  = require('multer')
const path = require('path')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.resolve('./tmp'));
    },
    filename: async (req, file, cb) => {
        const [fileName, extension] =  file.originalname.split('.');
        cb(null, `${fileName}.${extension}`);
    }
})

const uploadMiddleware = multer({storage});

const { 
    authMiddleware,
    credentialsCheckMiddleware,
    verifyEmailCheckMiddleware
 } = require('../../middleware/authMiddleware');
const { subscriptionCheckMiddleware } = require('../../middleware/userMiddleware');
const {
    registrationController,
    loginController,
    logoutController,
    checkCurrentUserController,
    verificationController,
    resendVerificationController
} = require('../../controllers/authController');
const { 
    updateSubscriptionController, 
    avatarUploadController 
} = require('../../controllers/userController');

router.post('/signup', credentialsCheckMiddleware, registrationController);
router.post('/login', credentialsCheckMiddleware, loginController);
router.get('/current', authMiddleware, checkCurrentUserController);
router.get('/logout', authMiddleware, logoutController);
router.patch('/', 
    authMiddleware, 
    subscriptionCheckMiddleware, 
    updateSubscriptionController
);
router.patch('/avatars', 
    authMiddleware, 
    uploadMiddleware.single('avatar'), 
    avatarUploadController
);
router.get('/verify/:verificationToken', verificationController);
router.post('/verify', verifyEmailCheckMiddleware, resendVerificationController);
 

module.exports = { authRouter: router };