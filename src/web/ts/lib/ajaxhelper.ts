/**
 * Ajax request helpers
 */
import * as $ from 'jquery';


export function updateAjaxURL(prefix: string) {
  if (prefix) {
    $.ajaxPrefilter((options) => {
      // when the prefix is /traveler, it conflicts with resources like /travelers/...
      if (options.url && options.url.indexOf(prefix + '/') !== 0) {
        options.url = prefix + options.url;
      }
    });
  }
}

export function ajax401(prefix: string) {
  $(document).ajaxError((event, jqXHR, settings, exception) => {
    if (jqXHR.status === 401) {
      $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>Please click <a href="' + prefix + '/login" target="_blank">login</a>, log in, and then save the changes on this page.</div>');
      const offset = $('#message div:last-child').offset();
      if (offset) {
        $(window).scrollTop(offset.top - 40);
      }
    }
  });
}

export function disableAjaxCache() {
  const ua = window.navigator.userAgent;
  const msie = ua.indexOf('MSIE ');
  if (msie > 0) {
    $.ajaxSetup({
      cache: false,
    });
  }
}
