<?php

/**
 * Application route definitions.
 *
 * Every route is registered via the global `route()` function defined in
 * public/index.php. Routes are grouped into sections for clarity.
 *
 * @package AvrHomes
 */

declare(strict_types=1);

/* ── Health check ─────────────────────────────────────────── */
route('GET', '/api/health', function () {
  $ffmpeg = null;
  if (function_exists('exec')) {
    exec('which ffmpeg 2>/dev/null', $ffOut, $ffCode);
    $ffmpeg = $ffCode === 0 ? ($ffOut[0] ?? 'available') : 'not found';
  } else {
    $ffmpeg = 'exec() disabled';
  }
  Response::success([
    'status'  => 'ok',
    'time'    => date('c'),
    'php'     => PHP_VERSION,
    'ffmpeg'  => $ffmpeg,
    'disabled_functions' => ini_get('disable_functions'),
  ]);
});

/* ── Auth routes ──────────────────────────────────────────── */
route('POST', '/api/auth/login', ['AuthController', 'login']);
route('POST', '/api/auth/logout', ['AuthController', 'logout']);
route('GET', '/api/auth/me', ['AuthController', 'me']);
route('POST', '/api/auth/refresh', ['AuthController', 'refreshToken']);

/* ── Agent Auth routes ────────────────────────────────────── */
route('POST', '/api/auth/agent/register', ['AuthController', 'registerAgent']);
route('POST', '/api/auth/agent/login', ['AuthController', 'loginAgent']);
route('GET', '/api/agent/listings', ['AgentListingController', 'index'], ['middleware' => SubscriptionMiddleware::class]);

/* ── Property routes ──────────────────────────────────────── */
route('GET', '/api/properties', ['PropertyController', 'index']);
route('GET', '/api/properties/{id}', ['PropertyController', 'show']);
route('POST', '/api/properties', ['PropertyController', 'store']);
route('PUT', '/api/properties/{id}', ['PropertyController', 'update']);
route('DELETE', '/api/properties/{id}', ['PropertyController', 'destroy']);

/* ── Public stats ─────────────────────────────────────────── */
route('GET', '/api/stats', ['StatsController', 'index']);

/* ── Agent public routes ──────────────────────────────────── */
route('GET', '/api/agents', ['AgentController', 'index']);
route('GET', '/api/agents/by-slug/{slug}', ['AgentController', 'showBySlug']);
route('GET', '/api/agents/{id}', ['AgentController', 'show']);

/* ── Agent Profile routes (agent only) ────────────────────── */
route('GET', '/api/agent/profile', ['AgentController', 'profile']);
route('PUT', '/api/agent/profile', ['AgentController', 'updateProfile']);
route('POST', '/api/agent/profile/avatar', ['AgentController', 'updateAvatar']);

/* ── Inquiry routes ───────────────────────────────────────── */
route('POST', '/api/inquiries', ['InquiryController', 'store']);
route('GET', '/api/inquiries', ['InquiryController', 'index']);
route('DELETE', '/api/inquiries/{id}', ['InquiryController', 'destroy']);

/* ── Contact routes ───────────────────────────────────────── */
route('POST', '/api/contact', ['ContactController', 'store']);
route('GET', '/api/contact', ['ContactController', 'index']);
route('DELETE', '/api/contact/{id}', ['ContactController', 'destroy']);

/* ── Agent Lead routes (agent only) ───────────────────────── */
route('GET', '/api/agent/leads', ['AgentLeadController', 'index']);
route('GET', '/api/agent/leads/unread-count', ['AgentLeadController', 'unreadCount']);
route('GET', '/api/agent/leads/{id}', ['AgentLeadController', 'show']);
route('PUT', '/api/agent/leads/{id}/read', ['AgentLeadController', 'markRead']);
route('PUT', '/api/agent/leads/{id}/status', ['AgentLeadController', 'updateStatus']);
route('PUT', '/api/agent/leads/{id}/notes', ['AgentLeadController', 'updateNotes']);

/* ── Agent Listing routes (agent only) ────────────────────── */
route('GET', '/api/agent/listings', ['AgentListingController', 'index']);
route('POST', '/api/agent/listings', ['AgentListingController', 'store']);
route('GET', '/api/agent/listings/stats', ['AgentListingController', 'stats']);
route('GET', '/api/agent/listings/{id}', ['AgentListingController', 'show']);
route('PUT', '/api/agent/listings/{id}', ['AgentListingController', 'update']);
route('PUT', '/api/agent/listings/{id}/status', ['AgentListingController', 'updateStatus']);
route('DELETE', '/api/agent/listings/{id}', ['AgentListingController', 'destroy']);

/* ── Verification routes (agent) ──────────────────────────── */
route('POST', '/api/agent/listings/{id}/documents', ['PropertyVerificationController', 'uploadDocument']);
route('GET', '/api/agent/listings/{id}/verification', ['PropertyVerificationController', 'getVerificationStatus']);

/* ── Verification routes (admin) ──────────────────────────── */
route('GET', '/api/admin/verifications', ['PropertyVerificationController', 'adminIndex']);
route('PUT', '/api/admin/verifications/{id}/approve', ['PropertyVerificationController', 'adminApprove']);
route('PUT', '/api/admin/verifications/{id}/reject', ['PropertyVerificationController', 'adminReject']);

/* ── Admin subscription management ──────────────────────────── */
route('GET', '/api/admin/subscriptions', ['SubscriptionController', 'adminIndex']);
route('PUT', '/api/admin/subscriptions/{id}/tier', ['SubscriptionController', 'adminUpdateTier']);
route('PUT', '/api/admin/subscriptions/{id}/status', ['SubscriptionController', 'adminUpdateStatus']);
route('GET', '/api/agent/subscription', ['SubscriptionController', 'index']);
route('POST', '/api/agent/subscription/upgrade', ['SubscriptionController', 'upgrade']);
route('POST', '/api/agent/subscription/cancel', ['SubscriptionController', 'cancel']);

/* ── Admin referral management ────────────────────────────── */
route('GET', '/api/admin/referrals', ['ReferralController', 'adminIndex']);
route('GET', '/api/admin/referrals/stats', ['ReferralController', 'adminStats']);
route('PUT', '/api/admin/referrals/{id}/reward', ['ReferralController', 'adminUpdateReward']);
route('PUT', '/api/admin/referrals/{id}/mark-paid', ['ReferralController', 'adminMarkPaid']);

/* ── Referral routes (agent) ──────────────────────────────── */
route('GET', '/api/agent/referrals', ['ReferralController', 'index']);
route('POST', '/api/agent/referrals/generate', ['ReferralController', 'generateCode']);
route('GET', '/api/agent/referrals/stats', ['ReferralController', 'stats']);

/* ── Admin wallet / withdrawal management ─────────────────── */
route('GET', '/api/admin/wallets', ['WalletController', 'adminWallets']);
route('GET', '/api/admin/withdrawals', ['WalletController', 'adminWithdrawals']);
route('PUT', '/api/admin/withdrawals/{id}/approve', ['WalletController', 'adminApproveWithdrawal']);
route('PUT', '/api/admin/withdrawals/{id}/reject', ['WalletController', 'adminRejectWithdrawal']);
route('GET', '/api/agent/wallet', ['WalletController', 'show']);
route('GET', '/api/agent/wallet/transactions', ['WalletController', 'transactions']);
route('POST', '/api/agent/wallet/withdraw', ['WalletController', 'requestWithdrawal']);

/* ── Leaderboard routes ───────────────────────────────────── */
route('GET', '/api/leaderboard/weekly', ['LeaderboardController', 'weekly']);
route('GET', '/api/leaderboard/monthly', ['LeaderboardController', 'monthly']);
route('GET', '/api/leaderboard/quarterly', ['LeaderboardController', 'quarterly']);
route('POST', '/api/admin/leaderboard/refresh', ['LeaderboardController', 'refresh']);

/* ── Market Data routes ───────────────────────────────────── */
route('GET', '/api/market', ['MarketDataController', 'index']);
route('GET', '/api/market/heatmap', ['MarketDataController', 'heatmap']);
route('GET', '/api/market/price-index', ['MarketDataController', 'priceIndex']);
route('GET', '/api/market/reports', ['MarketDataController', 'reportsList']);
route('GET', '/api/market/reports/{period}', ['MarketDataController', 'report']);
route('POST', '/api/market/reports', ['MarketDataController', 'publishReport']);

/* ── Short-let routes (public) ────────────────────────────── */
route('GET', '/api/shortlet/{id}/availability', ['ShortLetController', 'availability']);
route('POST', '/api/shortlet/{id}/book', ['ShortLetController', 'book']);

/* ── Coupon routes ─────────────────────────────────────────── */
route('GET', '/api/admin/coupons', ['CouponController', 'adminIndex']);
route('POST', '/api/admin/coupons', ['CouponController', 'adminCreate']);
route('PUT', '/api/admin/coupons/{id}', ['CouponController', 'adminUpdate']);
route('DELETE', '/api/admin/coupons/{id}', ['CouponController', 'adminDelete']);
route('GET', '/api/admin/coupons/{id}/usage', ['CouponController', 'adminUsage']);
route('POST', '/api/coupons/validate', ['CouponController', 'validate']);

/* ── Email template & broadcast routes ──────────────────── */
route('GET', '/api/admin/email-templates', ['EmailTemplateController', 'adminTemplates']);
route('POST', '/api/admin/email-templates', ['EmailTemplateController', 'adminCreateTemplate']);
route('PUT', '/api/admin/email-templates/{id}', ['EmailTemplateController', 'adminUpdateTemplate']);
route('DELETE', '/api/admin/email-templates/{id}', ['EmailTemplateController', 'adminDeleteTemplate']);
route('GET', '/api/admin/email-broadcasts', ['EmailTemplateController', 'adminBroadcasts']);
route('POST', '/api/admin/email-broadcasts', ['EmailTemplateController', 'adminCreateBroadcast']);
route('PUT', '/api/admin/email-broadcasts/{id}', ['EmailTemplateController', 'adminUpdateBroadcast']);

/* ── Admin short-let management ──────────────────────────── */
route('GET', '/api/admin/shortlet/stats', ['ShortLetController', 'adminDashboardStats']);
route('GET', '/api/admin/shortlet/{id}/availability', ['ShortLetController', 'adminAvailability']);
route('PUT', '/api/admin/shortlet/availability', ['ShortLetController', 'adminUpdateAvailability']);
route('PUT', '/api/admin/shortlet/availability/batch', ['ShortLetController', 'adminBatchAvailability']);
route('GET', '/api/admin/shortlet/{id}/bookings', ['ShortLetController', 'adminPropertyBookings']);

/* ── Agent short-let routes ───────────────────────────────── */
route('GET', '/api/agent/shortlet/{id}/bookings', ['ShortLetController', 'bookings']);
route('PUT', '/api/agent/shortlet/bookings/{id}/status', ['ShortLetController', 'updateBookingStatus']);

/* ── Admin dashboard routes ───────────────────────────────── */
route('GET', '/api/admin/stats', ['AdminController', 'stats']);
route('GET', '/api/admin/analytics/trends', ['AdminController', 'trends']);
route('GET', '/api/admin/analytics/breakdown', ['AdminController', 'breakdown']);
route('GET', '/api/admin/moderation', ['AdminController', 'moderation']);

/* ── Admin property management ────────────────────────────── */
route('GET', '/api/admin/properties', ['AdminController', 'properties']);
route('GET', '/api/admin/properties/{id}', ['AdminController', 'getProperty']);
route('POST', '/api/admin/properties', ['AdminController', 'createProperty']);
route('PUT', '/api/admin/properties/{id}', ['AdminController', 'updateProperty']);
route('PUT', '/api/admin/properties/{id}/status', ['AdminController', 'updatePropertyStatus']);
route('PUT', '/api/admin/properties/{id}/feature', ['AdminController', 'toggleFeature']);
route('PUT', '/api/admin/properties/{id}/verify', ['AdminController', 'verifyProperty']);
route('DELETE', '/api/admin/properties/{id}', ['AdminController', 'deleteProperty']);
route('GET', '/api/admin/properties/{id}/images', ['AdminController', 'propertyImages']);
route('POST', '/api/admin/properties/upload-gallery', ['AdminController', 'uploadGallery']);
route('PUT', '/api/admin/properties/images/{id}/primary', ['AdminController', 'setPrimaryImage']);
route('PUT', '/api/admin/properties/images/reorder', ['AdminController', 'reorderImages']);
route('DELETE', '/api/admin/properties/images/{id}', ['AdminController', 'deleteImage']);

/* ── Admin agent management ───────────────────────────────── */
route('GET', '/api/admin/agents', ['AdminController', 'agents']);
route('GET', '/api/admin/agents/{id}', ['AdminController', 'getAgent']);
route('PUT', '/api/admin/agents/{id}', ['AdminController', 'updateAgent']);
route('PUT', '/api/admin/agents/{id}/status', ['AdminController', 'updateAgentStatus']);
route('PUT', '/api/admin/agents/{id}/verify', ['AdminController', 'toggleAgentVerify']);
route('DELETE', '/api/admin/agents/{id}', ['AdminController', 'deleteAgent']);

/* ── Admin user management ────────────────────────────────── */
route('GET', '/api/admin/users', ['AdminController', 'users']);
route('GET', '/api/admin/users/{id}', ['AdminController', 'getUser']);
route('PUT', '/api/admin/users/{id}', ['AdminController', 'updateUser']);
route('PUT', '/api/admin/users/{id}/role', ['AdminController', 'updateUserRole']);

/* ── Admin booking management ─────────────────────────────── */
route('GET', '/api/admin/bookings', ['AdminController', 'bookings']);
route('PUT', '/api/admin/bookings/{id}/status', ['AdminController', 'updateBookingStatus']);

/* ── Admin activity log ───────────────────────────────────── */
route('GET', '/api/admin/activity', ['AdminController', 'activity']);
route('GET', '/api/admin/activity/export', ['AdminController', 'exportActivity']);

/* ── Admin inquiry management ─────────────────────────────── */
route('GET', '/api/admin/inquiries', ['AdminController', 'inquiries']);
route('PUT', '/api/admin/inquiries/{id}/read', ['AdminController', 'updateInquiryRead']);
route('PUT', '/api/admin/inquiries/{id}/status', ['AdminController', 'updateInquiryStatus']);
route('PUT', '/api/admin/inquiries/{id}/notes', ['AdminController', 'updateInquiryNotes']);
route('PUT', '/api/admin/inquiries/{id}/assign', ['AdminController', 'assignInquiry']);
route('DELETE', '/api/admin/inquiries/{id}', ['AdminController', 'deleteInquiry']);

/* ── Admin contact message management ─────────────────────── */
route('GET', '/api/admin/contact-messages', ['AdminController', 'contactMessages']);
route('PUT', '/api/admin/contact-messages/{id}/read', ['AdminController', 'updateContactMessageRead']);
route('DELETE', '/api/admin/contact-messages/{id}', ['AdminController', 'deleteContactMessage']);

/* ── Admin blog management ────────────────────────────────── */
route('GET', '/api/admin/blog', ['AdminController', 'blogPosts']);
route('POST', '/api/admin/blog', ['BlogController', 'store']);
route('PUT', '/api/admin/blog/{id}', ['BlogController', 'update']);
route('DELETE', '/api/admin/blog/{id}', ['BlogController', 'destroy']);

/* ── Upload routes ────────────────────────────────────────── */
route('POST', '/api/upload', ['UploadController', 'upload']);
route('POST', '/api/upload/gallery', ['UploadController', 'uploadGallery']);
route('POST', '/api/upload/media', ['UploadController', 'uploadMedia']);
route('POST', '/api/upload/from-url', ['UploadController', 'uploadFromUrl']);
route('POST', '/api/upload/video-gallery', ['UploadController', 'uploadVideoGallery']);
route('DELETE', '/api/upload/video/{id}', ['UploadController', 'destroyVideo']);
route('GET', '/api/upload/sign', ['UploadController', 'sign']);
route('DELETE', '/api/upload/{id}', ['UploadController', 'destroy']);

/* ── Settings routes ──────────────────────────────────────── */
route('GET', '/api/settings', ['SettingController', 'index']);
route('POST', '/api/settings', ['SettingController', 'update']);

/* ── Saved Search routes (authenticated) ──────────────────── */
route('GET', '/api/saved-searches', ['SavedSearchController', 'index']);
route('POST', '/api/saved-searches', ['SavedSearchController', 'store']);
route('PUT', '/api/saved-searches/{id}', ['SavedSearchController', 'update']);
route('DELETE', '/api/saved-searches/{id}', ['SavedSearchController', 'destroy']);

/* ── Admin saved search routes ───────────────────────────── */
route('GET', '/api/admin/saved-searches', ['SavedSearchController', 'adminIndex']);
route('DELETE', '/api/admin/saved-searches/{id}', ['SavedSearchController', 'adminDelete']);

/* ── Migration routes (admin only) ────────────────────────── */
route('POST', '/api/admin/migrations/run', ['MigrationController', 'run']);
route('POST', '/api/admin/migrations/run/{name}', ['MigrationController', 'run']);
route('GET', '/api/admin/migrations/status', ['MigrationController', 'status']);

/* ── Admin Import / Export routes ────────────────────────── */
route('GET', '/api/admin/export/properties', ['ImportExportController', 'exportProperties']);
route('GET', '/api/admin/export/users', ['ImportExportController', 'exportUsers']);
route('GET', '/api/admin/export/agents', ['ImportExportController', 'exportAgents']);
route('GET', '/api/admin/export/bookings', ['ImportExportController', 'exportBookings']);
route('GET', '/api/admin/export/sample', ['ImportExportController', 'sampleCsv']);
route('POST', '/api/admin/import/properties', ['ImportExportController', 'importProperties']);
route('POST', '/api/admin/import/users', ['ImportExportController', 'importUsers']);
route('POST', '/api/admin/import/agents', ['ImportExportController', 'importAgents']);

/* ── Blog / CMS routes ────────────────────────────────────── */
route('GET', '/api/blog', ['BlogController', 'index']);
route('GET', '/api/blog/featured', ['BlogController', 'featured']);
route('GET', '/api/blog/categories', ['BlogController', 'categories']);
route('GET', '/api/blog/{slug}', ['BlogController', 'show']);
route('GET', '/api/agent/blog', ['BlogController', 'agentIndex']);
route('POST', '/api/agent/blog', ['BlogController', 'store']);
route('PUT', '/api/agent/blog/{id}', ['BlogController', 'update']);
route('DELETE', '/api/agent/blog/{id}', ['BlogController', 'destroy']);

/* ── Off-plan project progress routes ───────────────────── */
route('GET', '/api/properties/{id}/progress', ['OffPlanController', 'index']);
route('GET', '/api/agent/progress/{propertyId}', ['OffPlanController', 'agentIndex']);
route('POST', '/api/agent/progress/{propertyId}', ['OffPlanController', 'store']);
route('PUT', '/api/agent/progress/{id}', ['OffPlanController', 'update']);
route('DELETE', '/api/agent/progress/{id}', ['OffPlanController', 'destroy']);

/* ── Admin off-plan management ─────────────────────────── */
route('GET',    '/api/admin/offplan/progress/{propertyId}', ['OffPlanController', 'adminIndex']);
route('POST',   '/api/admin/offplan/progress/{propertyId}', ['OffPlanController', 'adminStore']);
route('DELETE', '/api/admin/offplan/progress/{id}',         ['OffPlanController', 'adminDestroy']);

/* ── Admin announcement / notification management ───────── */
route('GET', '/api/admin/announcements', ['AdminAnnouncementController', 'index']);
route('GET', '/api/admin/announcements/{id}', ['AdminAnnouncementController', 'show']);
route('POST', '/api/admin/announcements', ['AdminAnnouncementController', 'store']);
route('DELETE', '/api/admin/announcements/{id}', ['AdminAnnouncementController', 'destroy']);

/* ── User-facing notification routes ───────────────────── */
route('GET', '/api/notifications', ['NotificationController', 'index']);
route('GET', '/api/notifications/unread-count', ['NotificationController', 'unreadCount']);
route('PUT', '/api/notifications/{id}/read', ['NotificationController', 'markAsRead']);
route('PUT', '/api/notifications/read-all', ['NotificationController', 'markAllAsRead']);

/* ── Investment / KYC routes ────────────────────────────── */
route('GET', '/api/investments/opportunities', ['InvestmentController', 'opportunities']);
route('GET', '/api/investments/{id}', ['InvestmentController', 'show']);
route('POST', '/api/investments/buy', ['InvestmentController', 'buy']);
route('GET', '/api/investments/portfolio', ['InvestmentController', 'portfolio']);
route('POST', '/api/investments/{id}/sell', ['InvestmentController', 'sell']);

route('GET', '/api/kyc/status', ['KYCController', 'status']);
route('POST', '/api/kyc/submit', ['KYCController', 'submit']);

/* ── Admin investment management ───────────────────────── */
route('GET',    '/api/admin/investments',          ['InvestmentController', 'adminList']);
route('GET',    '/api/admin/investments/{id}',     ['InvestmentController', 'adminShow']);
route('POST',   '/api/admin/investments',          ['InvestmentController', 'adminCreate']);
route('PUT',    '/api/admin/investments/{id}',     ['InvestmentController', 'adminUpdate']);
route('PUT',    '/api/admin/investments/{id}/status', ['InvestmentController', 'adminUpdateStatus']);
route('DELETE', '/api/admin/investments/{id}',     ['InvestmentController', 'adminDelete']);
route('POST',   '/api/admin/investments/dividends', ['InvestmentController', 'adminDeclareDividend']);
route('PUT',    '/api/admin/investments/dividends/{id}/pay', ['InvestmentController', 'adminPayDividend']);

/* ── Admin KYC review ────────────────────────────────── */
route('GET',  '/api/admin/kyc',              ['KYCController', 'adminList']);
route('PUT',  '/api/admin/kyc/{id}/verify',  ['KYCController', 'adminVerify']);
route('PUT',  '/api/admin/kyc/{id}/reject',  ['KYCController', 'adminReject']);

/* ── Admin role & permission management ──────────────────── */
route('GET', '/api/admin/roles', ['RoleController', 'adminRoles']);
route('GET', '/api/admin/roles/{id}', ['RoleController', 'adminRoleDetail']);
route('POST', '/api/admin/roles', ['RoleController', 'adminCreateRole']);
route('PUT', '/api/admin/roles/{id}', ['RoleController', 'adminUpdateRole']);
route('DELETE', '/api/admin/roles/{id}', ['RoleController', 'adminDeleteRole']);
route('GET', '/api/admin/permissions', ['RoleController', 'adminPermissions']);
route('PUT', '/api/admin/roles/{id}/permissions', ['RoleController', 'adminUpdateRolePermissions']);
route('GET', '/api/admin/role-users', ['RoleController', 'adminRoleUsers']);
route('PUT', '/api/admin/role-users/assign', ['RoleController', 'adminAssignRole']);
route('GET', '/api/admin/my-permissions', ['RoleController', 'adminMyPermissions']);
