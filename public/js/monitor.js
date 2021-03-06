"use strict";
/* global ga */
/* global libpolycrypt */
/* global sendPing */
/* global getFxaUtms */


if (typeof TextEncoder === "undefined") {
  const cryptoScript = document.createElement("script");
  const scripts = document.getElementsByTagName("script")[0];
  cryptoScript.src = "/dist/edge.min.js";
  scripts.parentNode.insertBefore(cryptoScript, scripts);
}

const eventList = {
  "Social": {
    "eventCategory": "Social",
    "eventAction": "Share",
  },
  "SignUp": {
    "eventCategory": "Sign Ups",
    "eventAction": "Button Click",
  },
  "SignUp_Complete": {
    "eventCategory": "Sign Ups",
    "eventAction": "Complete",
  },
  "Resend": {
    "eventCategory": "Resend Confirmation Email",
    "eventAction": "Button Click",
  },
  "CloseModal": {
    "eventCategory": "Modal Closes",
    "eventAction": "Closed Modal",
  },
  "Unsubscribe": {
    "eventCategory": "Unsubscribe",
    "eventAction": "Button Click",
  },
  "UnsubscribeSurvey": {
    "eventCategory": "Unsubscribe Survey Submittal",
    "eventAction": "Button Click",
  },
  "Scan": {
    "eventCategory": "Scans",
    "eventAction": "",
  },
  "ShowAdditional": {
    "eventCategory": "Show Additional Breaches",
    "eventAction": "Button Click",
  },
  "Pageview": {
    "eventCategory":"Views",
    "eventAction": "",
  },
  "Download": {
    "eventCategory": "Download",
    "eventAction": "Firefox Download",
  },
  "Link": {
    "eventCategory": "Link Clicks",
    "eventAction": "Link Click",
  },
  "ShareByEmail": {
    "eventCategory": "ShareByEmail",
    "eventAction": "Shared Firefox Monitor",
  },
};

// determines which page the event occurs and is sent to google analytics in ga_sendLegacyPing() as the eventLabel or custom dimension.

function ga_getLocation() {
  if (document.querySelector(".landing-content")) {
    if (document.getElementById("sensitive-featured-breach")) {
      return "Sensitive Featured Breach Page";
    }
    if (document.getElementById("featured-breach")) {
      return "Featured Breach Page";
    }
    return "Landing Page";
  }
  if (document.getElementById("found-breaches")) {
      return "Scan Results - found breaches";
  }
  if (document.getElementById("no-breaches")) {
      return "Scan Results - no breaches";
  }
  if (document.getElementById("unsubscribe")) {
    return "Unsubscribe Page";
  }
  if (document.getElementById("unsubscribe-survey")) {
    return "Unsubscribe Survey";
  }
  if (document.getElementById("subpage") && document.getElementById("subpage").getAttribute("data-analytics-id") === "error" ) {
    return "Error";
  }
  if (document.getElementById("confirmation")) {
    return "Account Confirmation Page";
  }
  return "Firefox Monitor";
}


function ga_sendLegacyPing(eventDescription, eventLabel) {
  if (typeof(ga) !== "undefined") {
    const event = eventList[eventDescription];
    const eventCategory = event["eventCategory"];
    const eventAction = event["eventAction"];

    if (!eventLabel) {
      eventLabel = ga_getLocation();
    } else {
      eventLabel = eventLabel + " --- " + ga_getLocation();
    }
    return ga("send", "event", eventCategory, eventAction, eventLabel);
  }
}


function isValidEmail(val) {
  // https://stackoverflow.com/a/46181
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(val).toLowerCase());
}

function removeInvalidMessage(e) {
  const thisForm = e.target.form;
  thisForm.classList.remove("invalid");
}

function doOauth(el) {
  let url = new URL("/oauth/init", document.body.dataset.serverUrl);
  url = getFxaUtms(url);
  ["flowId", "flowBeginTime", "entrypoint"].forEach(key => {
    url.searchParams.append(key, encodeURIComponent(el.dataset[key]));
  });
  if (localStorage.getItem("scanned")) {
    const lastScannedEmail = localStorage.getItem("scanned");
    localStorage.removeItem("scanned");
    url.searchParams.append("email", lastScannedEmail);
  }
  window.location.assign(url);
}

// restricts tabbing to modal elements when modal is open.
// disables tabbing on modal elements when modal is closed.
function setModalTabbing(){

  // get tabbable elements in sign up form window
  let modalTabContent = Array.from(document.getElementById("subscribe-to-ffxm").querySelectorAll("a, input, button"));
  // if "confirm your email" message is showing, tab those elements instead
  if (!document.getElementById("subscribe-to-ffxm").classList.contains("show")) {
    modalTabContent = Array.from(document.getElementById("confirm-your-account").querySelectorAll("a, input, button"));
  }
  // if modal is displayed, set tabindex to 1 on only those elements
  // and disable tabbing on everything else
  if (document.body.classList.contains("show-subscribe-modal")) {
    document.querySelectorAll("a, button, input").forEach(eachElement => {
      eachElement.setAttribute("tabindex", modalTabContent.includes(eachElement) ? "1" : "-1");
    });

    return;
  }
  // disable tabbing if modal window is closed and re-enable all other tabbing
  document.querySelectorAll("a, button, input").forEach( eachElement => {
    eachElement.setAttribute("tabindex", !modalTabContent.includes(eachElement) ? "1" : "-1");
  });
}

const focusFirstInput = function(e) {
  if (e.target.querySelector("input")) {
    e.target.querySelector("input").focus();
  }
  e.target.removeEventListener("transitioned", focusFirstInput);
};

function closeModalWindow() {
  document.body.classList.remove("show-subscribe-modal");
  document.getElementById("subscribe-to-ffxm").classList.remove("show");
  if (document.getElementById("subscribe-modal").classList.contains("fxa-enabled")) {
    return;
  }
  document.getElementById("confirm-your-account").classList.remove("show", "sending", "sent");
  document.getElementById("subscribe-form").classList.remove("invalid");
  document.getElementById("subscribe-email-input").value = "";
  document.getElementById("additional-emails-checkbox").checked = false;
  setModalTabbing();
}

function openModalWindow() {
  const subscribeModal = document.getElementById("subscribe-modal");
  document.body.classList.add("show-subscribe-modal");
  document.getElementById("subscribe-to-ffxm").classList.add("show");
  setModalTabbing();
  if (subscribeModal.classList.contains("fxa-enabled")) {
    return;
  }
  const modalForm = document.getElementById("subscribe-form");
  sendPing(modalForm, "View");
  document.getElementById("modal-terms").addEventListener("click", ()=> {
    sendPing(modalForm, "Terms Engage");
  });
  document.getElementById("subscribe-form").classList.remove("loading-data");
  subscribeModal.addEventListener("transitionend", (e) => focusFirstInput(e));
  subscribeModal.addEventListener("click", function closeWrapper(e) {
    if (e.target === subscribeModal) {
      if (document.getElementById("subscribe-to-ffxm").classList.contains("show")) {
        sendPing(modalForm, "Cancel");
        ga_sendLegacyPing("CloseModal", "Clicked outside modal to close - Before Sign Up");
      } else {
        ga_sendLegacyPing("CloseModal", "Clicked outside modal to close - After Sign Up");
      }
      closeModalWindow();
      document.getElementById("subscribe-modal").removeEventListener("click", closeWrapper);
    }
  });
}

// handles checkbox states and expands the 'checkbox clickable space'
// by letting user click the checkbox's wrapping div to toggle states
function checkBoxStates(checkBoxEvent) {
  checkBoxEvent.preventDefault();
  let checkBox;
  // user tabs (keyCode === 9) or tabs BACK (keyCode === 16) to checkbox element
  if (checkBoxEvent.keyCode === 9 || checkBoxEvent.keyCode === 16) {
    checkBox = checkBoxEvent.target;
    checkBox.focused = true;
    return;
  }
  // user hit space to select checkbox element
  if (checkBoxEvent.keyCode === 32 ) {
    checkBox = checkBoxEvent.target;
  }
  // user clicks checkbox group
  if (checkBoxEvent.target.classList.contains("checkbox-group")) {
    const thisCheckBoxGroup = checkBoxEvent.target;
    checkBox = thisCheckBoxGroup.querySelector("input[type=checkbox]");
  }
  checkBox.checked = !checkBox.checked;
}

async function sha1(message) {
  message = message.toLowerCase();
  const msgBuffer = new TextEncoder("utf-8").encode(message);
  let hashBuffer;
  if (/edge/i.test(navigator.userAgent)) {
    hashBuffer = libpolycrypt.sha1(msgBuffer);
  } else {
    hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  }
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => ("00" + b.toString(16)).slice(-2)).join("");
  return hashHex.toUpperCase();
}

async function hashEmailAndSend(emailFormSubmitEvent) {
  const emailForm = emailFormSubmitEvent.target;
  ga_sendLegacyPing("Scan", false);
  emailForm.classList.add("loading-data");
  const emailInput = document.getElementById("scan-email");
  emailForm.querySelector("input[name=emailHash]").value = await sha1(emailInput.value);
  localStorage.setItem("scanned", emailInput.value);
  emailInput.value = "";
  sendPing(emailForm, "Success");
  emailForm.submit();
}

const resendSubscribeData = function() {
  ga_sendLegacyPing("Resend", false);
  document.getElementById("confirm-your-account").classList.add("sending");
  const userEmail = {
    "email": document.getElementById("submitted-email").textContent,
  };
  postData("/user/add", userEmail)
    .then(data => {
      document.getElementById("confirm-your-account").classList.add("sent");
      document.getElementById("resend-data").removeEventListener("click", resendSubscribeData);
    })
  .catch(error => console.error(error));
};

const addUser = (formEvent) => {
  const formElement = formEvent.target;
  const formObject = {};
  formObject["email"] = formElement.querySelector("#subscribe-email-input").value;
  if (formElement.querySelector("input[type=checkbox]").checked) {
    formObject["additionalEmails"] = "Opt user in to additional emails";
  }
  postData(formElement.action, formObject)
    .then(data => {
      document.getElementById("subscribe-to-ffxm").classList.remove("show");
      document.getElementById("confirm-your-account").classList.add("show");
      setModalTabbing();
      document.getElementById("submitted-email").textContent = formObject["email"];
      document.getElementById("resend-data").addEventListener("click", resendSubscribeData);
    })
    .catch(error => console.error(error));
};

const unsubscribeSurvey = (formEvent) => {
  const unsubSurvey = formEvent.target;
  ga_sendLegacyPing("UnsubscribeSurvey", unsubSurvey.querySelector("input[type='radio']:checked").dataset.analyticsLabel);
  const surveyObject = {};
  postData(unsubSurvey.action, surveyObject)
    .then( () => {
      unsubSurvey.classList.add("show-thankyou");
    });
};

const postData = (url, data = {}) => {
  return fetch(url, {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      headers: {
          "Content-Type": "application/json; charset=utf-8",
      },
      // redirect: "follow", // manual, *follow, error
      referrer: "no-referrer", // no-referrer, *client
      body: JSON.stringify(data), // body data type must match "Content-Type" header
  })
  .then(response => response.json()) // parses response to JSON
  .catch(error => console.error(error));
};

function showAdditionalBreaches(){
  document.getElementById("show-additional-breaches").classList.toggle("hide");
  const additionalBreaches = document.getElementById("additional-breaches");
  additionalBreaches.classList.toggle("show-breaches");
}

const handleRadioButtons = function(form) {
  const inputFields = Array.from(form.querySelectorAll(".radio-button-group, .button"));
  // set up ability to move between radio options by arrow key
  for (let x = 0; x < inputFields.length ; x++) {
    const input = inputFields[x];
    input.addEventListener("focus", (e) => {
      if (form.classList.contains("invalid")) {
        form.classList.remove("invalid");
      }
      input.addEventListener("keydown", (e) => {
        // if up arrow (keyCode 38) is clicked
        if (e.keyCode === 38 && inputFields[x-1]) {
          inputFields[x-1].focus();
        }
        // if down arrow (keyCode 40) is clicked
        if (e.keyCode === 40 && inputFields[x+1]) {
          inputFields[x+1].focus();
        }
        // select option by space key (keyCode 32)
        if (e.keyCode === 32 && input.classList.contains("radio-button-group")) {
          inputFields[x].querySelector("input").checked = true;
        }
      });
    });
  }
};

function addFormListeners() {
  Array.from(document.forms).forEach( form =>  {
    if (form.querySelector("input[type=email]")) {
      const emailInput = form.querySelector("input[type=email]");
      emailInput.addEventListener("keydown", (e) => removeInvalidMessage(e));
      // legacy update: send ping on first keydown for subscribe forms
      if (form.id === "subscribe-form") {
          emailInput.addEventListener("keydown", () => {
            if (emailInput.value === "") {
              sendPing(form, "Engage");
            }
          });
      } else {
        // send ping when user focuses cursor in empty input
        emailInput.addEventListener("focus", () => {
          if (emailInput.value === "") {
            sendPing(form, "Engage");
          }
        });
      }
    }
    if (form.querySelector("input[type=checkbox]")) {
      const checkBoxWrapper = form.querySelector(".checkbox-group");
      checkBoxWrapper.addEventListener("click", (e) => checkBoxStates(e));
      checkBoxWrapper.addEventListener("keyup",(e) => checkBoxStates(e));
    }

    if(form.querySelector("input[type=radio]")) {
      handleRadioButtons(form);
    }
    form.addEventListener("submit", (e) => handleFormSubmits(e));
  });
}

function handleFormSubmits(formEvent) {
  if (formEvent.target.id === "unsubscribe-form") {
    ga_sendLegacyPing("Unsubscribe", false);
    return;
  }
  formEvent.preventDefault();
  if (formEvent.target.id === "unsubscribe-survey-form") {
    // show error message if no option is selected
    if (!formEvent.target.querySelector("input[type='radio']:checked")) {
      formEvent.target.classList.add("invalid");
      return;
    }
    unsubscribeSurvey(formEvent);
    return;
  }
  const thisForm = formEvent.target;
  const email = thisForm.email.value.trim();
  thisForm.email.value = email;
  sendPing(thisForm, "Submit");
  if (!email || !isValidEmail(email)) {
    sendPing(thisForm, "Failure");
    thisForm.classList.add("invalid");
    return;
  }
  if (thisForm.classList.contains("email-scan")) {
    hashEmailAndSend(formEvent);
    return;
  }
  if (formEvent.target.id === "subscribe-form") {
    formEvent.target.classList.add("loading-data");
    addUser(formEvent);
    setModalTabbing();
    sendPing(formEvent.target, "Success");
    ga_sendLegacyPing("SignUp_Complete", false);
    return;
  }
  formEvent.submit();
  return;
}

async function doButtonRouting(event) {
  if (document.body.dataset.fxaEnabled === "fxa-enabled") {
    if (event.target.classList.contains("sign-up-button") || event.target.id === "login-btn" || event.target.classList.contains("open-oauth")) {
      return doOauth(event.target);
    }
  } else {
    if (event.target.id === "sign-up") {
      ga_sendLegacyPing("SignUp", false);
      openModalWindow();
      return;
    }
  }
  if (event.target.id === "show-additional-breaches") {
    ga_sendLegacyPing("ShowAdditional", false);
    return showAdditionalBreaches();
  }
  if (event.target.id === "subscribe-fxa-btn") {
    doOauth();
    closeModalWindow();
    return;
  }
  if (event.target.classList.contains("close-modal")) {
    ga_sendLegacyPing("CloseModal", event.target.dataset.analyticsLabel);
    closeModalWindow();
    return;
  }
  return;
}

//re-enables inputs and clears loader
function restoreInputs() {
  Array.from(document.forms).forEach( form => {
    form.classList.remove("loading-data");
    form.classList.remove("invalid");
  });
  document.querySelectorAll("input").forEach( input => {
    if (input.disabled) {
      input.disabled = false;
    }
  });
}


const animateMobileMenuIcon = () => {
  if (document.body.classList.contains("menu-open")) {
    document.getElementById("menu-path").setAttribute("d", "M5.293 6.707a1 1 0 1 1 1.414-1.414L12 10.586l5.293-5.293a1 1 0 1 1 1.414 1.414L13.414 12l5.293 5.293a1 1 0 0 1-1.414 1.414L12 13.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L10.586 12 5.293 6.707z");
  } else {
    document.getElementById("menu-path").setAttribute("d", "M4 7a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1zm0 5a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1zm1 4a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H5z");
  }
};


const toggleMobileMenu = () => {
  document.body.classList.toggle("menu-open");
  document.body.classList.toggle("menu-closed");
  animateMobileMenuIcon();
};


const toggleMobileFeatures = function() {
  const page = document.body;
  if (window.innerWidth > 575) {
    if (document.body.classList.contains("menu-open")) {
      document.body.classList.remove("menu-open");
      animateMobileMenuIcon();
      return;
    }
    document.body.classList.remove("enable-mobile");
    return;
  }
  page.classList.add("enable-mobile");
  if (document.getElementById("menu-icon-wrapper")) {
    document.body.classList.add("menu-closed");
    document.getElementById("menu-icon-wrapper").addEventListener("click", toggleMobileMenu);
    document.getElementById("bg-screen").addEventListener("click", toggleMobileMenu);
  }
};


document.addEventListener("touchstart", function(){}, true);

window.addEventListener("pageshow", function() {
  ga_sendLegacyPing("Pageview", false);

  if (window.location.search.includes("utm_") && window.history.replaceState) {
    window.history.replaceState({}, "", window.location.toString().replace(/[?&]utm_.*/g, ""));
  }
  toggleMobileFeatures();
  document.forms ? (restoreInputs(), addFormListeners()) : null;
});

if (document.body.dataset.fxaEnabled === "fxa-enabled") {
  toggleMobileFeatures();
  window.addEventListener("resize", toggleMobileFeatures);
  if (document.getElementById("fxa-new-user-bar")) {
    document.getElementById("x-close").addEventListener("click", () => {
      document.getElementById("fxa-new-user-bar").classList.toggle("close");
    });
  }
  // capitalize the sign in button for en-US only.
  if (window.navigator.language.includes("en") && document.getElementById("login-btn")) {
    document.getElementById("login-btn").classList.add("capitalize");
  }
}

if (document.getElementById("subpage")) {
  document.body.classList.add("sub");
}

if (document.getElementById("latest-breaches") || document.getElementById("no-breaches")) {
  if (document.getElementById("scan-another-email")) {
    document.getElementById("scan-another-email").classList.add("banner");
  }
}

// collect ping triggering elements, attach listeners
document.querySelectorAll("[data-analytics-event]").forEach(el => {
  el.addEventListener("click", (e) => {
    ga_sendLegacyPing(e.target.dataset.analyticsEvent, e.target.dataset.analyticsLabel);
  });
});

// listen for missing breach logo images and replace them with default icon
document.querySelectorAll(".breach-logo").forEach(logo => {
  logo.addEventListener("error", (missingLogo) => {
    missingLogo.target.src = "/img/logos/missing-logo-icon.png";
  });
});

document.querySelectorAll("button, .open-oauth").forEach(button => {
  button.addEventListener("click", (e) => doButtonRouting(e));
});
