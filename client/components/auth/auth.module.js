'use strict';

angular.module('bibleAppApp.auth', ['bibleAppApp.constants', 'bibleAppApp.util', 'ngCookies',
    'ui.router'
  ])
  .config(function($httpProvider) {
    $httpProvider.interceptors.push('authInterceptor');
  });
