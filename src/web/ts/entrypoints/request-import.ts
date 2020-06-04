/**
 * Request bulk import
 */
import '../pages/base';

import 'jquery-validation';

import * as $ from 'jquery';

// import * as Binder from '../lib/binder';


function readFileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (evt) => {
      evt.target.abort();
      reject(evt.target.error);
    };
    reader.onload = (evt) => {
      const result = evt.target.result;
      if (typeof result !== 'string') {
        reject(new TypeError(''));
        return;
      }
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

$(() => {
  $('#request-import-form').submit(async (evt) => {
    evt.preventDefault();

    const importFileInput = $('#request-import-file').get(0) as HTMLInputElement;
    if (importFileInput.files.length === 0) {
      console.log('No file selected!');
      return;
    }
    //const importFileData = await readFileToBase64(importFileInput.files[0]);

    const formData = new FormData(evt.target as HTMLFormElement);

    $.ajax({
      url: window.location.pathname,
      method: 'POST',
      data: formData,
      dataType: 'json',
      processData: false,
      contentType: false,
    });

    // console.log(importFileData);

    // const importValidated = $('#request-import-validated').is(':checked');

  });
});
