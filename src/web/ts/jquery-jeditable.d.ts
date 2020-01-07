/**
 * Unofficial type definition for jquery-jeditable module v2.0.10
 * 
 * API document: https://jeditable.elabftw.net/api/#jquery-jeditable
 */
/// <reference types="jquery" />

interface JQuery {
  editable(action: string | JQueryJEditable.CustomAction,  options: JQueryJEditable.Options): void;
}

declare namespace JQueryJEditable {

  interface Options {
    type: string; // (default 'text')	text, textarea, select, email, number, url (or any 3rd party input type)
    cancel?: string // Cancel button value, empty means no button
    submit?: string // Submit button value, empty means no button
    indicator?: string; // Indicator html to show when saving
    placeholder: string; // Placeholder text or html to insert when element is empty (default 'Click to edit')
    cancelcssclass?: string; // CSS class to apply to cancel button 
    cssclass?: string; // CSS class to apply to input form; use 'inherit' to copy from parent 
    inputcssclass?: string; // CSS class to apply to input. 'inherit' to copy from parent 
    submitcssclass?: string; // CSS class to apply to submit button 
  }

  type CustomAction = (value: any, options: Options) => string;
}
