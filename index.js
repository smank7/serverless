//All code for Lambda Functions should now be in this repository.


const mailgun = require('mailgun-js');
const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');
const DOMAIN = 'mg.santoshicloud.me'; // e.g., mg.example.com
const mg = mailgun({apiKey: 'ab6278a1e329fe02f2d58aa310b530e4-f68a26c9-369a4df6', domain: DOMAIN});

dotenv.config();
 
exports.sendVerificationEmail = async (pubSubEvent, context) => {
  const message = pubSubEvent.data
    ? Buffer.from(pubSubEvent.data, 'base64').toString()
    : '{}';
  const userData = JSON.parse(message);
 
  // const { email } = userData;
  // const {token} = userData;
  // const expiryTime = Date.now() + 2 * 60 * 1000;
// const verificationLink = `http://santoshicloud.me:3000/verify?token=${token}`;
  const { email, verificationLink } = userData;
  const expiryTime = Date.now() + 2 * 60 * 1000;

  const emailData = {
    from: 'postmaster@mg.santoshicloud.me',
    to: email, // Assuming 'email' is the email address
    subject: 'Please verify your email address',
    html: `
      <h1>Email Verification</h1>
      <p>Please click on the link below to verify your email address:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>This link will expire in 2 minutes.</p>
    `
  };
 
    try {
        

        const body = await mg.messages().send(emailData);
    } catch (error) {
        console.error('An error occurred:', error);
    }
};
 
async function updateEmailSentStatus(email, verificationToken, expiryTime) {
  
  const sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    email: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  const User = sequelize.define('User', {
    id: {
      type: Sequelize.UUID, // Use UUID data type for id
      defaultValue: Sequelize.UUIDV4, // Generate UUID by default
      primaryKey: true, // Make id the primary key
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    account_created: {
      type: Sequelize.DATE,
      allowNull: false,
        aqdefaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    account_updated: {
      type: Sequelize.DATE,
      allowNull: true, // Allow null initially
    },
    isEmailVerified: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_email_verified'
    },
    mailSentAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
    verificationLink: {
      type: Sequelize.STRING,
      defaultValue: null  // Changed from false to null
    }
  }, {
    timestamps: false,
  });

  try{
    await sequelize.sync();
    const user = await User.findOne({ where: { email: email } });
    user.verificationLink = verificationToken;
    user.mailSentAt = expiryTime;
    await user.save();
    console.log("User saved with Verification Token")
  } catch(error){
    console.error(error.message);
  }

}
