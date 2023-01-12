var amqp = require('amqplib/callback_api');
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
	sendmail: true,
	newline: 'unix',
	path: '/usr/sbin/sendmail',
})

amqp.connect('amqp://localhost', function(err, connection) {
  connection.createChannel(function(err, channel) {
    var queue = 'mail';

    channel.assertQueue(queue);
    channel.prefetch(1);
    console.log(' [x] Awaiting requests');

    channel.consume(queue, function reply(msg) {
      console.log("Recieved");
      let data = JSON.parse(msg.content);
      console.log(data);

      let verificationLink = "http://coolkids.cse356.compas.cs.stonybrook.edu/users/verify?email=" + encodeURIComponent(data.email) + "&key=" + encodeURIComponent(data.key);
      console.log(verificationLink);
      
      transporter.sendMail({
        to: data.email,
        from: '<root@coolkids.cse356.compas.cs.stonybrook.edu>',
        subject: 'Verification Email',
        text: verificationLink,
        textEncoding: "quoted-printable"
      });

      channel.ack(msg);
    });
  });
});

