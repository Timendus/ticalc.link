const { ticalc, tifiles } = require('ticalc-usb');

let calculator = null;
let file = null;

window.addEventListener('load', () => {
  if ( usbSupported() ) {
    showSupportedDevices();
    attachConnectionListeners();
    updateButtons();
    attachClickListeners();
  }
});

function usbSupported() {
  if ( navigator.usb ) {
    document.querySelector('#flow').classList.add('active');
    document.querySelector('#incompatible').classList.remove('active');
    return true;
  } else {
    document.querySelector('#flow').classList.remove('active');
    document.querySelector('#incompatible').classList.add('active');
    return false;
  }
}

function showSupportedDevices() {
  document.querySelector('#supported').innerText = ticalc.models().join(', ');
}

function updateButtons() {
  document.querySelectorAll('.buttons button').forEach(b =>
    b.classList.remove('active', 'complete')
  );

  if ( calculator )
    document.querySelector('#connect').classList.add('complete');
  else {
    document.querySelector('#connect').classList.add('active');
    document.querySelector('#connect').focus();
  }

  if ( file )
    document.querySelector('#upload').classList.add('complete');
  else if ( calculator ) {
    document.querySelector('#upload').classList.add('active');
    document.querySelector('#upload').focus();
  }

  if ( calculator && file ) {
    document.querySelector('#start').classList.add('active');
    document.querySelector('#start').focus();
  }
}

function attachConnectionListeners() {
  ticalc.addEventListener('disconnect', calc => {
    // Maybe we disconnected a different calculator than
    // the one we currently have selected..?
    if ( calc != calculator ) return;

    calculator = null;
    updateButtons();
  });

  ticalc.addEventListener('connect', async calc => {
    if ( await calc.isReady() ) {
      calculator = calc;
      updateButtons();
    }
  });
}

function attachClickListeners() {
  document.querySelector('#connect')
          .addEventListener('click', () => ticalc.choose());

  document.querySelector('#upload')
          .addEventListener('click', () => selectFile());

  document.querySelector('#start')
          .addEventListener('click', () => sendFile());
}

function selectFile() {
  const input = document.createElement('input');
  input.type  = 'file';
  input.accept = '.8xp,.8xg';
  input.addEventListener('change', async c => {
    file = tifiles.parseFile(await readFile(c.target.files[0]));
    console.log(file);

    if ( !tifiles.isValid(file) ) {
      file = null;
      alert('The file you have selected does not seem to be a valid calculator file');
    }

    updateButtons();
  });
  input.click();
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.addEventListener('load', (e) => resolve(new Uint8Array(e.target.result)));
    reader.readAsArrayBuffer(file);
  });
}

async function sendFile() {
  if ( !calculator || !file ) return;
  if ( !tifiles.isMatch(file, calculator) )
    return alert(`The file you have selected does not appear to be a valid file for your ${calculator.name}`);
  if ( (await calculator.getFreeMem()).ram < file.size )
    return alert('Your calculator does not have enough free memory to receive this file');

  try {
    await calculator.sendFile(file);
    document.querySelector('#start').classList.remove('active');
    document.querySelector('#start').classList.add('complete');
    setTimeout(() => alert('The file has been sent!'), 100);
  } catch(e) {
    alert('Sorry, something went wrong 😢');
  }
}
