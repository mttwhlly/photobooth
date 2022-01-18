``; // init project
const express = require("express");
const app = express();
const fs = require("fs-extra");
const uuid = require("uuid/v4");
const csrf = require("csurf");
const Twilio = require("twilio");
const sassMiddleware = require("node-sass-middleware");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const myParser = require("body-parser");

const MAX_MEDIA_AGE = 1000 * 60 * 5;
const mediaDir = __dirname + "/.data/media/";

// sass needs to go before static file serving to work
app.use(
  sassMiddleware({
    src: __dirname + "/source",
    dest: __dirname + "/public"
  })
);

// static file serving
app.use(express.static("public"));
app.use("/media", express.static(".data/media"));

// middleware for various things
app.use(
  require("express-session")({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true
  })
);
app.use(csrf());

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function(req, res) {
  let fileContent = fs
    .readFileSync(__dirname + "/views/index.html")
    .toString("utf-8");
  // insert the CSRF token into the response
  res.end(fileContent.replace("<!-- CSRF -->", req.csrfToken()));
});

// upload media assets
app.post("/upload", myParser.json({ limit: "200mb" }), (req, res) => {
  console.log("upload started");

  // assign a random name
  const id = uuid();
  const fileName = id + ".jpg";

  cloudinary.config({
    cloud_name: process.env.CLOUDNAME,
    api_key: process.env.CLOUDAPIKEY ,
    api_secret: process.env.CLOUDAPISECRET
  });
  var uploadStr = decodeURIComponent(req.body.data); //, options = {'resource_type', 'image'}";

  cloudinary.uploader
    .upload(uploadStr, function(error, result) {
      console.log(result);
    })
    .catch(console.error);

  // there was an oops
  req.on("error", e => {
    console.error(e);
    res.sendStatus(500);
  });
});

async function cleanMedia() {
  console.log("cleaning up old media");

  // get file list
  let mediaFiles = await fs.readdir(mediaDir);
  console.log(`found ${mediaFiles.length} media files`);

  // look for only expired media
  const expiredFiles = mediaFiles.filter(file => {
    let stats = fs.statSync(mediaDir + file);
    // is the file older than 5 minutes?
    return Date.now() - stats.birthtimeMs > MAX_MEDIA_AGE;
  });
  console.log(`cleaning up ${expiredFiles.length} expired media files`);

  // do the deletion
  expiredFiles.forEach(file => {
    fs.remove(mediaDir + file);
  });

  setTimeout(function() {
    cleanMedia().catch(e => console.warn(e));
  }, MAX_MEDIA_AGE);
}

// MMS code. doesn't work yet!
app.post("/mms", function(req, res) {

  // Create options to send the message
  const ourCoolMessage =
    "You look great! Thanks for being a part of this virtually. We can't wait to see you in person as soon as possible!!!";
  const mediaURL = `https://${process.env.PROJECT_DOMAIN}.glitch.me/media/${req.body.media}`;
  const options = {
    mediaUrl: [mediaURL],
    body: ourCoolMessage
  };
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
