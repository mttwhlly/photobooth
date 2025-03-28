(function() {
  "use strict";
  
  // browser funk alert
// window.addEventListener('load', (event) => {
//     alert('Hello & thank you for celebrating with us! 🎉 \n\nOnce the camera warms up, just press the "Push to Start" button to send us your photobooth pics & download some for yourself too! \n\nXOXO, \nthe Bride & Groom 👰🏻🤵🏼\n\nP.S. due to time constraints this app works best on modern desktop browsers (Chrome is a cool option) 💻\nP.P.S be sure to grant your browser webcam access 📸')
//   })

  //   *** Variables we use a bunch ***

  // Send SMS button
  const sendBtn = document.getElementById("uploadLink");
  // Take photo button
  const shutterBtn = document.getElementById("shutter");
  // Overlay when photo is done
  const previewWrapper = document.getElementById("preview-wrapper");

  // *** button text ***

  // maing screen buttons
  const shutterBtnDefault = "Press to Start";
  const shutterBtnActive = "Smile!";
  // sms button
  const phoneBtnDefault = "📱";
  const phoneBtnValid = "Send";
  const phoneBtnWorking = "Sending...";

  var preview;

  var running = false,
    ready = false,
    footerImage = new Image(),
    base_config = {
      ramp_time: 3000,
      frame_delay: 1000,
      num_frames: 1,
      prep_time: 3500,
      // footer_image: '',
      num_poses: 4,
      rows: 4,
      cols: 1,
      gutter: 50,
      gutter_color: "white",
      width: 1200,
      height: 3600
    };

  footerImage.crossOrigin = "anonymous";

  for (var name in base_config) {
    var input = document.getElementById("config_" + name);
    if (input) {
      input.value = base_config[name];
    }
  }

  function config(name) {
    var input = document.getElementById("config_" + name);
    if (input && input.value.length) {
      var value = input.value;
      if (name === "gutter_color") {
        return value;
      } else if (name === "auto_download") {
        return input.checked;
      } else if (parseInt(value)) {
        return parseInt(value);
      }
    }
    return base_config[name];
  }

  // computes the size of each gif
  function getTargetHeight() {
    return Math.floor(
      (config("height") - config("gutter")) / config("rows") - config("gutter")
    );
  }

  // computes width + gutters
  function getTargetWidth() {
    return Math.floor(
      (config("width") - config("gutter")) / config("cols") - config("gutter")
    );
  }

  const sleep = (time) => new Promise(resolve => setTimeout(resolve, time));

  function setStatus(text, body_class) {
    var status = document.getElementById("statustext");
    status.textContent = text;
    status.blur();
    document.body.classList = body_class || "";
  }

  function prepFrames() {
    var frames = [],
      context;
    let footerWidth, footerHeight;
    if (config("footer_image")) {
      footerWidth = getTargetWidth();
      footerHeight = Math.round(
        (footerWidth / footerImage.width) * footerImage.height
      );
    }
    // for (var i = 0; i < config("num_frames"); ++i) {
    frames[0] = document.createElement("canvas");
    frames[0].width = config("width");
    frames[0].height = config("height");
    context = frames[0].getContext("2d");
    context.fillStyle = config("gutter_color");
    context.fillRect(0, 0, frames[0].width, frames[0].height);
    if (config("footer_image")) {
      context.drawImage(
        footerImage,
        (config("cols") - 1) * getTargetWidth() +
          config("cols") * config("gutter"),
        frames[0].height - config("gutter") - footerHeight,
        footerWidth,
        footerHeight
      );
    }
    // }
    return frames;
  }

  function setCountdown(i) {
    if (config("prep_time") > 3000) {
      var pose_time = config("frame_delay") * config("num_frames");
      sleep(
        config("prep_time") * i + (config("prep_time") - 3000) + pose_time * i
      ).then(function() {
        for (let count = 0; count < 3; ++count) {
          sleep(1000 * count).then(function() {
            setStatus(3 - count, "count");
          });
        }
      });
    }
  }

  function drawPose(frame, i) {
    var target_height = getTargetHeight();
    var target_width = getTargetWidth();
    var context = frame.getContext("2d");
    var video = document.getElementById("videomirror");
    // new math for cols and rows
    let x = i % config("cols");
    let y = Math.floor(i / config("cols"));
    context.drawImage(
      video,
      x * target_width + (x + 1) * config("gutter"),
      y * target_height + (y + 1) * config("gutter"),
      target_width,
      target_height
    );
  }

  function compileJPG(frames) {
    console.log(frames);

    var preview = document.getElementById("preview");

    frames[0].toBlob(
      function(blob) {
        // console.log(blob);
        if (preview.src) {
          URL.revokeObjectURL(preview.src);
        }
        var url = URL.createObjectURL(blob);
        preview.src = url;
        var downloadlink = document.getElementById("downloadlink");
        downloadlink.href = url;
        downloadlink.download = "L&M.jpg";

        previewWrapper.classList.add("active");
        setStatus("Ready!");
        // document.querySelector("#uploadLink").onclick = function(e) {
        //   e.preventDefault();

        //convert blob to base64 for server script to upload to cdn
        // var reader = new FileReader();
        // reader.readAsDataURL(blob);
        // reader.onloadend = function() {
        //   var base64data = reader.result;
        //   console.log(base64data);
        // };
        // console.log(reader);

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = function() {
          var base64data = reader.result;
          console.log(base64data);
          uploadMedia(encodeURIComponent(base64data), url);
        };

        // Start reading the blob as text.
        // var blbtxt = reader.readAsDataURL(blob);
      },
      "image/jpeg",
      1.0
    );

    running = false;
    setStatus("Loading photos");
  }

  function toggleCaptureButton() {
    if (ready && !running) {
      shutterBtn.removeAttribute("disabled");
      shutterBtn.innerHTML = shutterBtnDefault;
    } else {
      // shutterBtn.style.display = "none";
      shutterBtn.disabled = true;
      shutterBtn.innerHTML = shutterBtnActive;
    }
  }

  function resetForm() {
    // document.getElementById("phone-number").value = "";
    // sendBtn.disabled = true;
    // sendBtn.innerHTML = phoneBtnDefault;
  }

  async function startCapture() {
    if (!(ready && !running)) {
      toggleCaptureButton();
      return;
    }
    
    try {
      setStatus("Get ready...", "ready");
      previewWrapper.classList.remove("active");
      running = true;
      
      const num_frames = config("num_frames");
      const frame_delay = config("frame_delay");
      const pose_time = frame_delay * num_frames;
      const frames = prepFrames();
      const rows = config("num_poses");
      
      for (let i = 0; i < rows; ++i) {
        setCountdown(i);
        await sleep(config("prep_time") * (i + 1) + pose_time * i);
        
        for (let j = 0; j < num_frames; ++j) {
          await sleep(frame_delay * j);
          drawPose(frames[j], i);
          
          if (j === num_frames - 1) {
            console.log("ready to ready");
            setStatus("Pose!", "pose");
          }
          
          if (i === rows - 1 && j === num_frames - 1) {
            setStatus("Pose!", "pose");
            console.log("ready to compile");
            await compileJPG(frames);
          }
        }
      }
    } catch (error) {
      console.error("Error in capture process:", error);
      setStatus("An error occurred", "error");
      running = false;
    } finally {
      toggleCaptureButton();
    }
  }

  shutterBtn.onclick = startCapture;

  document.getElementById("closelink").onclick = function() {
    var prevPar = document.getElementById('preview-wrapper');
    prevPar.classList.remove("active");

    resetForm();
    // reset button
    toggleCaptureButton();
  };

  document.onkeypress = function(event) {
    if (event.keyCode === 13) {
      if (previewWrapper.classList.contains("active")) {
        previewWrapper.classList.remove("active");
      } else {
        startCapture();
      }
    }
  };

  function drawVideoMirror(video) {
    var target_height = getTargetHeight();
    var target_width = getTargetWidth();
    var videomirror = document.getElementById("videomirror");
    videomirror.width = target_width;
    videomirror.height = target_height;
    var context = videomirror.getContext("2d");
    var ratio = Math.max(
      target_width / video.videoWidth,
      target_height / video.videoHeight
    );
    var x = (target_width - video.videoWidth * ratio) / 2;
    var y = (target_height - video.videoHeight * ratio) / 2;
    context.translate(videomirror.width, 0);
    context.scale(-1, 1);
    context.drawImage(
      video,
      0,
      0,
      video.videoWidth,
      video.videoHeight,
      x,
      y,
      video.videoWidth * ratio,
      video.videoHeight * ratio
    );
  }

  if (navigator && navigator.mediaDevices) {
// Camera initialization using async/await
async function initializeCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    });
    
    const video = document.getElementById("video");
    video.srcObject = stream;
    video.play();
    
    // Convert the canplay event to a Promise
    await new Promise(resolve => {
      video.addEventListener("canplay", resolve, { once: true });
    });
    
    // Start function wrapped in async
    const start = async () => {
      await sleep(config("ramp_time"));
      ready = true;
      setStatus("Ready!");
      
      function update() {
        drawVideoMirror(video);
        requestAnimationFrame(update);
      }
      update();
    };
    
    // Handle footer image loading
    if (config("footer_image")) {
      await new Promise(resolve => {
        footerImage.onload = resolve;
        footerImage.src = config("footer_image");
      });
      await start();
    } else {
      await start();
    }
    
  } catch (error) {
    console.error(error);
    setStatus("Webcam issues. Did you deny access?", "error");
  }
}
  } else {
    setStatus("Incompatible browser. Chrome latest works!", "error");
  }

  initializeCamera();

  async function uploadMedia(blob, url) {
    try {
      console.log(blob);
      console.log(url);
      const token = document.body.getAttribute("data-csrf");
  
      // Convert FileReader callback to Promise
      const base64data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      console.log(base64data);
      
      // Now we can use await with fetch
      const response = await fetch("/upload", {
        credentials: "same-origin",
        body: JSON.stringify({ data: encodeURIComponent(base64data) }),
        method: "POST",
        headers: {
          "CSRF-Token": token,
          "content-type": "application/json",
          imgUrl: url
        }
      });
      
      // Optional: handle response
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error(error);
      alert("Oh no! Something went wrong. Try again.");
    }
  }
})();
