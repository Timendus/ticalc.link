const { ticalc, tifiles } = require('ticalc-usb');

let calculator = null;
let file = null;

window.addEventListener('load', () => {
  if ( ticalc.browserSupported() ) {
    showSupportedDevices();
    attachConnectionListeners();
    updateButtons();
    attachClickListeners();
    ticalc.init({ supportLevel: 'none' })
    .catch(e => handleUnsupported(e));

    document.querySelector('#flow').classList.add('active');
    document.querySelector('#incompatible').classList.remove('active');
  } else {
    document.querySelector('#flow').classList.remove('active');
    document.querySelector('#incompatible').classList.add('active');
  }
});

function showSupportedDevices() {
  const calcNames = ticalc.models()
                          .filter(c => c.status == 'supported' || c.status == 'beta')
                          .map(c => c.status == 'beta' ? c.name + ' (beta)' : c.name)
                          .join(', ');
  document.querySelector('#supported').innerText = calcNames;
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
    if ( ( calc.status == 'experimental' || calc.status == 'beta' ) &&
         !confirm(`It looks like your device (${calc.name}) only has ${calc.status} support. Are you sure you want to continue?`) )
      return;
    if ( await calc.isReady() ) {
      calculator = calc;
      updateButtons();
    }
  });
}

function attachClickListeners() {
  document.querySelector('#connect')
          .addEventListener('click', () =>
            ticalc.choose()
            .catch(e => handleUnsupported(e))
          );

  document.querySelector('#upload')
          .addEventListener('click', () => selectFile());

  document.querySelector('#start')
          .addEventListener('click', () => sendFile());
}

function selectFile() {
  const input = document.createElement('input');
  input.type  = 'file';
  input.accept = '.8xp,.8xg,.83p,.83g,.82p,.82g';
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
  if ( !calculator.canReceive(file) )
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
    console.error(e);
  }
}

function handleUnsupported(error) {
  if ( error && error.message == 'Calculator model not supported' ) {
    if ( confirm('Sorry, it looks like your device is not yet supported. Would you like to submit it for consideration?') )
      sendSupportRequest(error.device);
  } else {
    console.error(error);
  }
}

function sendSupportRequest(device) {
  document.querySelector('#flow').innerHTML = `
    <h1>Device info to submit</h1>
    <p>Please <a href='https://github.com/Timendus/ticalc-usb/issues/new?assignees=&labels=device+support+request&template=calculator-support-request.md&title=Calculator+support+request' target="_blank">file a support request on Github</a> with the following information:</p>
    <pre>${JSON.stringify({
      deviceClass: device.deviceClass,
      deviceProtocol: device.deviceProtocol,
      deviceSubclass: device.deviceSubclass,
      deviceVersionMajor: device.deviceVersionMajor,
      deviceVersionMinor: device.deviceVersionMinor,
      deviceVersionSubminor: device.deviceVersionSubminor,
      manufacturerName: device.manufacturerName,
      productId: device.productId,
      productName: device.productName,
      serialNumber: device.serialNumber,
      usbVersionMajor: device.usbVersionMajor,
      usbVersionMinor: device.usbVersionMinor,
      usbVersionSubminor: device.usbVersionSubminor,
      vendorId: device.vendorId
    }, null, 2)}</pre>
  `;
}
