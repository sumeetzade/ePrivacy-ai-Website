<?php
// Copy this file to config.php on the server and fill in the real values.
// config.php is git-ignored: never commit SMTP credentials.
return [
    'smtp' => [
        'host'     => 'smtp.example.com',
        'port'     => 587,          // 587 with 'tls' (STARTTLS), or 465 with 'ssl'
        'secure'   => 'tls',        // 'tls' or 'ssl'
        'username' => 'enquiry@eprivacy-ai.com',
        'password' => 'CHANGE_ME',
    ],
    'from_email' => 'enquiry@eprivacy-ai.com',
    'from_name'  => 'ePrivacy-AI Website',
    'to_email'   => 'enquiry@eprivacy-ai.com',

    // Origins allowed to call send-mail.php (scheme + host, no trailing slash).
    'allowed_origins' => [
        'https://www.eprivacy-ai.com',
        'https://eprivacy-ai.com',
    ],

    'max_per_hour'      => 5,       // submissions allowed per visitor IP per hour
    'send_confirmation' => false,   // true: also email the visitor an acknowledgement
];
