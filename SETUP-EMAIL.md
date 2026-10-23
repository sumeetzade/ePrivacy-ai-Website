# Email setup (PHP + SMTP)

The contact form and the "Export Custom TCO PDF" form post to `send-mail.php`,
which emails `enquiry@eprivacy-ai.com` through your SMTP server using PHPMailer.

## On the AWS server (PHP 8.1 or newer)

1. Upload the site files to the web root, including `send-mail.php`,
   `composer.json` and `.htaccess`.
2. Install PHPMailer in that folder:
   ```bash
   composer install --no-dev
   ```
3. Create the credentials file from the template and edit it:
   ```bash
   cp config.example.php config.php
   nano config.php
   chmod 640 config.php
   ```
   Set the SMTP host, port, `tls` (587) or `ssl` (465), username and password,
   and list your real site address(es) in `allowed_origins`.
4. Test: submit the contact form on the live site. Check `enquiry@eprivacy-ai.com`.
   Errors are written to the PHP error log (`error_log`).

## Notes

- `config.php` is in `.gitignore`. Never commit it.
- nginx does not read `.htaccess`. Add a rule that denies access to
  `config.php` and `composer.*`, or place `config.php` above the web root and
  change the path in `send-mail.php`.
- PHP does not run on GitHub Pages, so the forms only work on the AWS site.
- If mail lands in spam, add SPF, DKIM and DMARC records for `eprivacy-ai.com`
  (your mail provider shows the values), and keep `from_email` on that domain.
- `max_per_hour` limits how often one visitor can submit. The hidden `website`
  field is a spam trap.

## Clean URLs (no .html)

`.htaccess` serves `/about` from `about.html` and redirects `/about.html` to `/about`.
Apache needs `mod_rewrite` enabled and `AllowOverride All` for the site folder.
The rules assume the site is at the domain root.

For nginx, use this instead:

```nginx
location / {
    try_files $uri $uri.html $uri/ =404;
}
if ($request_uri ~ ^/(.*)\.html(\?|$)) {
    return 301 /$1;
}
```
