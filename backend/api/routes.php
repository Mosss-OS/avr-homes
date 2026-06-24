<?php

declare(strict_types=1);

// Health check
route('GET', '/api/health', function () {
  Response::success([
    'status'  => 'ok',
    'time'    => date('c'),
    'php'     => PHP_VERSION,
  ]);
});

// Auth routes
route('POST', '/api/auth/login', ['AuthController', 'login']);
route('POST', '/api/auth/logout', ['AuthController', 'logout']);
route('GET', '/api/auth/me', ['AuthController', 'me']);
route('POST', '/api/auth/refresh', ['AuthController', 'refreshToken']);

// Agent Auth routes
route('POST', '/api/auth/agent/register', ['AuthController', 'registerAgent']);
route('POST', '/api/auth/agent/login', ['AuthController', 'loginAgent']);

// Property routes
route('GET', '/api/properties', ['PropertyController', 'index']);
route('GET', '/api/properties/{id}', ['PropertyController', 'show']);
route('POST', '/api/properties', ['PropertyController', 'store']);
route('PUT', '/api/properties/{id}', ['PropertyController', 'update']);
route('DELETE', '/api/properties/{id}', ['PropertyController', 'destroy']);

// Agent routes
route('GET', '/api/agents', ['AgentController', 'index']);
route('GET', '/api/agents/{id}', ['AgentController', 'show']);

// Inquiry routes
route('POST', '/api/inquiries', ['InquiryController', 'store']);
route('GET', '/api/inquiries', ['InquiryController', 'index']);
route('DELETE', '/api/inquiries/{id}', ['InquiryController', 'destroy']);

// Contact routes
route('POST', '/api/contact', ['ContactController', 'store']);
route('GET', '/api/contact', ['ContactController', 'index']);
route('DELETE', '/api/contact/{id}', ['ContactController', 'destroy']);

// Upload routes
route('POST', '/api/upload', ['UploadController', 'upload']);
route('POST', '/api/upload/gallery', ['UploadController', 'uploadGallery']);
route('DELETE', '/api/upload/{id}', ['UploadController', 'destroy']);

// Settings routes
route('GET', '/api/settings', ['SettingController', 'index']);
route('POST', '/api/settings', ['SettingController', 'update']);
