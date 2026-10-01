// @ts-nocheck
export const InitialTestPlanData = {
  objective: "Verify Forgot Password flow on target web application",
  targetUrl: "https://test.com/forgot-password",
  preconditions: ["Target app test.com server online", "Valid user email registered in test database"],
  testData: { email: "user@test.com", expectedToast: "Password reset link sent" },
  steps: [
    { id: 1, action: "Open URL", selector: "https://test.com/login", expected: "Login page loaded with email input" },
    { id: 2, action: "Click Element", selector: "#forgot-password-link", expected: "Navigate to /forgot-password page" },
    { id: 3, action: "Fill Form Input", selector: "#email-input", expected: "Email 'user@test.com' entered" },
    { id: 4, action: "Click Submit Button", selector: "#send-reset-btn", expected: "API POST /api/auth/forgot-password triggered" },
    { id: 5, action: "Verify Toast Notification", selector: ".toast-success", expected: "Success notification displayed" },
    { id: 6, action: "Verify Email Response API", selector: "POST /api/auth/forgot-password", expected: "HTTP 200 with reset token payload" },
  ]
};

// Fallback steps when /tasks/generate-plan is offline or returns no steps
export const FallbackPlanSteps = [
  { id: 1, action: "Open URL", selector: "https://test.com/login", expected: "Target page loaded successfully" },
  { id: 2, action: "Click Element", selector: "#forgot-password-link", expected: "Navigation to reset form" },
  { id: 3, action: "Fill Input Field", selector: "#email-input", expected: "Test email inserted" },
  { id: 4, action: "Click Send Link Button", selector: "#send-reset-btn", expected: "POST /api/auth/forgot-password 200 OK" },
  { id: 5, action: "Verify Success Toast", selector: ".toast-success", expected: "Confirmation toast displayed" },
  { id: 6, action: "Validate API Response", selector: "POST /api/auth/forgot-password", expected: "JSON response payload valid" }
];

