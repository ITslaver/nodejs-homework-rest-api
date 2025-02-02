const bcrypt = require('bcrypt');
const gravatar = require('gravatar');
const { v4: uuid } = require('uuid');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const { User } = require('../db/usersModel');
const { 
    RegistrationConflictError,
    AuthorizationError,
    NotFoundError,
    ValidationError
 } = require('../helpers/errors');



const register = async (email, password) => {
    const userCheck = await User.findOne({email});
    if (userCheck) {
        throw new RegistrationConflictError("Email in use");
    }

    const verificationToken = uuid();

    const user = new User({
        email,
        password,
        avatarURL: gravatar.url(email),
        verificationToken
    });
    await user.save();

    const msg = {
        to: email,
        from: process.env.SENDER_EMAIL, 
        subject: 'Please verify your email',
        html: `<strong>Thank you for signing up!</strong>
        </br>
        <p>Please verify your email address to complete the registration. Follow the link below:</p>
        </br>
        <a href='http://localhost:3000/api/users/verify/${verificationToken}'>Verify email</a>`,
    }

    try {
        await sgMail.send(msg);
    } catch(err) {
        throw new Error(err);
    }
    
}

const login = async (email, password) => {
    const user = await User.findOne({email});
    if (!user) {
        throw new AuthorizationError("Email or password is wrong");
    }

    const passwordCheck = await bcrypt.compare(password, user.password);
    if (!passwordCheck) {
        throw new AuthorizationError("Email or password is wrong");
    }

    if (!user.verify) {
        throw new AuthorizationError("Email not verified");
    }

    const token = jwt.sign({
        _id: user._id
    }, process.env.JWT_SECRET);

    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $set: { token } }
    )

    return { token, updatedUser };
}

const checkCurrentUser = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AuthorizationError("Not Authorized");
    }

    return user;
}

const logout = async (userId) => {
    const user = await User.findByIdAndUpdate(
        userId,
        { $set: { token: null } }
    )

    if (!user) {
        throw new AuthorizationError("Not Authorized");
    }

    return user;
}

const verification = async (verificationToken) => {
    const user = await User.findOneAndUpdate(
        {verificationToken},
        { $set: { 
            verificationToken: null,
            verify: true
        }}
    );

    if (!user) {
        throw new NotFoundError("User not found");
    }

    return user;
}

const resendVerification = async (email) => {
    const user = await User.findOne({email});
    if (!user) {
        throw new NotFoundError("User not found");
    }

    if (user.verify) {
        throw new ValidationError("Verification has already been passed");
    }

    const msg = {
        to: email,
        from: process.env.SENDER_EMAIL, 
        subject: 'Please verify your email',
        html: `<strong>Thank you for signing up!</strong>
        </br>
        <p>Please verify your email address to complete the registration. Follow the link below:</p>
        </br>
        <a href='http://localhost:3000/api/users/verify/${user.verificationToken}'>Verify email</a>`,
    }

    try {
        await sgMail.send(msg);
    } catch(err) {
        throw new Error(err);
    }

    return user;
}

module.exports = {
    register,
    login,
    checkCurrentUser,
    logout,
    verification,
    resendVerification
}