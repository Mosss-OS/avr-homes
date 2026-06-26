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

// Agent public routes
route('GET', '/api/agents', ['AgentController', 'index']);
route('GET', '/api/agents/by-slug/{slug}', ['AgentController', 'showBySlug']);
route('GET', '/api/agents/{id}', ['AgentController', 'show']);

// Agent Profile routes (agent only)
route('GET', '/api/agent/profile', ['AgentController', 'profile']);
route('PUT', '/api/agent/profile', ['AgentController', 'updateProfile']);
route('POST', '/api/agent/profile/avatar', ['AgentController', 'updateAvatar']);

// Inquiry routes
route('POST', '/api/inquiries', ['InquiryController', 'store']);
route('GET', '/api/inquiries', ['InquiryController', 'index']);
route('DELETE', '/api/inquiries/{id}', ['InquiryController', 'destroy']);

// Contact routes
route('POST', '/api/contact', ['ContactController', 'store']);
route('GET', '/api/contact', ['ContactController', 'index']);
route('DELETE', '/api/contact/{id}', ['ContactController', 'destroy']);

// Agent Lead routes (agent only)
route('GET', '/api/agent/leads', ['AgentLeadController', 'index']);
route('GET', '/api/agent/leads/unread-count', ['AgentLeadController', 'unreadCount']);
route('GET', '/api/agent/leads/{id}', ['AgentLeadController', 'show']);
route('PUT', '/api/agent/leads/{id}/read', ['AgentLeadController', 'markRead']);
route('PUT', '/api/agent/leads/{id}/status', ['AgentLeadController', 'updateStatus']);
route('PUT', '/api/agent/leads/{id}/notes', ['AgentLeadController', 'updateNotes']);

// Agent Listing routes (agent only)
route('GET', '/api/agent/listings', ['AgentListingController', 'index']);
route('POST', '/api/agent/listings', ['AgentListingController', 'store']);
route('GET', '/api/agent/listings/stats', ['AgentListingController', 'stats']);
route('GET', '/api/agent/listings/{id}', ['AgentListingController', 'show']);
route('PUT', '/api/agent/listings/{id}', ['AgentListingController', 'update']);
route('PUT', '/api/agent/listings/{id}/status', ['AgentListingController', 'updateStatus']);
route('DELETE', '/api/agent/listings/{id}', ['AgentListingController', 'destroy']);

// Verification routes (agent)
route('POST', '/api/agent/listings/{id}/documents', ['PropertyVerificationController', 'uploadDocument']);
route('GET', '/api/agent/listings/{id}/verification', ['PropertyVerificationController', 'getVerificationStatus']);

// Verification routes (admin)
route('GET', '/api/admin/verifications', ['PropertyVerificationController', 'adminIndex']);
route('PUT', '/api/admin/verifications/{id}/approve', ['PropertyVerificationController', 'adminApprove']);
route('PUT', '/api/admin/verifications/{id}/reject', ['PropertyVerificationController', 'adminReject']);

// Upload routes
route('POST', '/api/upload', ['UploadController', 'upload']);
route('POST', '/api/upload/gallery', ['UploadController', 'uploadGallery']);
route('DELETE', '/api/upload/{id}', ['UploadController', 'destroy']);

// Settings routes
route('GET', '/api/settings', ['SettingController', 'index']);
route('POST', '/api/settings', ['SettingController', 'update']);

// Saved Search routes (authenticated)
route('GET', '/api/saved-searches', ['SavedSearchController', 'index']);
route('POST', '/api/saved-searches', ['SavedSearchController', 'store']);
route('PUT', '/api/saved-searches/{id}', ['SavedSearchController', 'update']);
route('DELETE', '/api/saved-searches/{id}', ['SavedSearchController', 'destroy']);

// Migration routes (admin only)
route('POST', '/api/admin/migrations/run', ['MigrationController', 'run']);
route('POST', '/api/admin/migrations/run/{name}', ['MigrationController', 'run']);
route('GET', '/api/admin/migrations/status', ['MigrationController', 'status']);
