const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const redis = require("redis");
const redisClient = redis.createClient();




const SESSION_FILE_PATH = './session.json';
const QR_FILE_PATH = './qr.txt';


let client;

let sessionData;
if(fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
    client = new Client({
        session: sessionData
    });
} else {
    client = new Client();
}


client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    if(fs.existsSync(QR_FILE_PATH)) {
        fs.unlinkSync(QR_FILE_PATH);
    }
    fs.writeFile(QR_FILE_PATH, qr, function (err) {
        if (err) {
            console.error(err);
        }
    });
    qrcode.generate(qr, {small: true});
});

client.on('message', message => {
	console.log(message.body, message.from);
    //message.reply('Ok')
});




client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('authenticated', (session) => {

    console.log('Auth saving')
    sessionData = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.on('auth_failure', ()=> {
    console.log('Auth failure occured')
})

client.on('disconnected', (reason)=>{
    console.log('Disconnected', reason)
})


client.initialize();



function getQR(){
    if(fs.existsSync(QR_FILE_PATH)) {
        return {status: 'success', data: fs.readFileSync(QR_FILE_PATH).toString()}
    } else {
        return {status: 'error', message:'qr not generated/found'}
    }
}

function killSessions(){
    client.destroy();
    if(fs.existsSync(SESSION_FILE_PATH)) {
        fs.unlinkSync(SESSION_FILE_PATH);
    }
    if(fs.existsSync(SESSION_FILE_PATH)) {
        return {status:'error', message: 'Unable to kill session try a hard cleanup / restart'}
    } else {       
        return {status:'success', message: 'Session killed succefuly'}
    }
}

function resumeSession(){
    if(fs.existsSync(SESSION_FILE_PATH)) {
        client.initialize();
        client.on('ready', () => {
            console.log('Client is ready again!');
            return {status:'success', message: 'client resumed'}
        });
    } else {
        return {status:'error', message: 'Unknown error occured while resuming client'}
    }
}



function sendMessage(phoneNumber, center ,sessions, userId) {

    redisClient.get(`${userId}-${center.center_id}`, (err, data) =>{
        if (data != null) {
            console.log(data, 'data from redis');

            const currentTime = new Date()
            const milliseconds = Math.abs(currentTime -new Date(data) );
            const hours = milliseconds / 36e5; 

            if (hours < 6) {
                console.log('Skipped sending message to ', phoneNumber, ' due to recently sent ');
            } else {
                console.log('Sending after 6 hours to', phoneNumber);
                redisClient.set(`${userId}-${center.center_id}`, new Date(), (err, data) =>{
                    sendRealMessage(phoneNumber,center, sessions);
                })
            }
        } else {
            console.log('Sending about a new center to ', phoneNumber);
            redisClient.set(`${userId}-${center.center_id}`, new Date(), (err, data) =>{
                sendRealMessage(phoneNumber, center , sessions);
            })
        }
})
}



function sendRealMessage(phoneNumber, center ,sessions) {
    client.sendMessage(`91${phoneNumber}@c.us`,  `Hi! We are gald to inform you the open slots for covid-19 vaccine in the region you were looking for
    
    Name: ${center.name}
    Address: ${center.address}
    Pincode: ${center.pincode}
    Free / Paid : ${center.fee_type}

    Here are the list of sessions :
        ${sessions.map(session => `
        Date:${session.date},
        Available Capacity : ${session.available_capacity},
        Minimum Age Limit : ${session.min_age_limit},
        Vacciine Name: ${session.vaccine},


        `)  }

    Quickly book your slots at https://selfregistration.cowin.gov.in 

    Stay Safe! Share the link among ur well wishers.
    To Unsubscribe, Reply UNSUBSCRIBE! Feel free to send feedback via insta: sahil_on_wheels
    Note:- Less than 10 slots probably means it may be booked until you pass the OTP stage.
    We are trying to reduce repeated message. Please bear with us.
    `)
    console.log('sentwhatsappmessage: to ', phoneNumber, ' on ', new Date());
                

}

function sendWelcomeMessage(phoneNumber) {
    console.log('sent welcome message to ', phoneNumber);
    client.sendMessage(`91${phoneNumber}@c.us`, `Hi There,
    Thank you for registering instant vaccination slot alerts.
    We are improving gradually.
    Stay Safe and Relaxed, we will notify you if new slots are available.

    If you find this helpful Please share among u well wishers.

    To Unsubscribe, Reply UNSUBSCRIBE! Feel free to send feedback via insta: sahil_on_wheels

    Note:- Less than 10 slots probably means it may be booked until you pass the OTP stage.
    We are trying to reduce repeated message. Please bear with us.

    `)
}


module.exports = {
    sendMessage,
    resumeSession,
    killSessions,
    sendWelcomeMessage,
}