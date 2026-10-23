<?php
declare(strict_types=1);

/**
 * Receives the contact form and the TCO summary request, and emails them
 * to the enquiry inbox over SMTP (PHPMailer). Credentials live in config.php,
 * which is not committed. See SETUP-EMAIL.md.
 */

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond(int $code, array $body): void
{
    http_response_code($code);
    echo json_encode($body);
    exit;
}

function line(mixed $v, int $max = 200): string
{
    $s = is_string($v) ? $v : '';
    $s = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $s) ?? '';
    return mb_substr(trim($s), 0, $max);
}

function block(mixed $v, int $max = 4000): string
{
    $s = is_string($v) ? $v : '';
    $s = preg_replace('/[^\P{C}\n]+/u', '', str_replace("\r", '', $s)) ?? '';
    return mb_substr(trim($s), 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'error' => 'Method not allowed.']);
}

$configFile = __DIR__ . '/config.php';
$autoload = __DIR__ . '/vendor/autoload.php';
if (!is_file($configFile) || !is_file($autoload)) {
    error_log('send-mail.php: config.php or vendor/autoload.php missing');
    respond(500, ['ok' => false, 'error' => 'Email is not set up on this server yet.']);
}
$cfg = require $configFile;
require $autoload;

// Only accept requests that come from our own site.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !in_array($origin, $cfg['allowed_origins'], true)) {
    respond(403, ['ok' => false, 'error' => 'Request not allowed.']);
}

$raw = file_get_contents('php://input') ?: '';
if (strlen($raw) > 30000) {
    respond(413, ['ok' => false, 'error' => 'Request too large.']);
}
$ctype = $_SERVER['CONTENT_TYPE'] ?? '';
$in = str_contains($ctype, 'application/json') ? (json_decode($raw, true) ?: []) : $_POST;
if (!is_array($in)) {
    respond(400, ['ok' => false, 'error' => 'Invalid request.']);
}

// Honeypot: real visitors never fill this hidden field. Pretend success to bots.
if (!empty($in['website'])) {
    respond(200, ['ok' => true]);
}

// Rate limit per IP: max N requests per hour.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/eprivacy_rate_' . hash('sha256', $ip);
$now = time();
$hits = [];
$fh = fopen($rateFile, 'c+');
if ($fh && flock($fh, LOCK_EX)) {
    $hits = array_filter(json_decode((string) stream_get_contents($fh), true) ?: [], fn ($t) => $t > $now - 3600);
    if (count($hits) >= (int) $cfg['max_per_hour']) {
        flock($fh, LOCK_UN);
        fclose($fh);
        respond(429, ['ok' => false, 'error' => 'Too many requests. Please try again later.']);
    }
    $hits[] = $now;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode(array_values($hits)));
    flock($fh, LOCK_UN);
}
if ($fh) {
    fclose($fh);
}

$type = line($in['type'] ?? '', 20);
$email = line($in['email'] ?? '', 254);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, ['ok' => false, 'error' => 'Please enter a valid email address.']);
}

if ($type === 'contact') {
    $name = line($in['name'] ?? '');
    $org = line($in['org'] ?? '');
    if ($name === '' || $org === '') {
        respond(422, ['ok' => false, 'error' => 'Please fill in your name and organization.']);
    }
    $subject = 'Architectural review request: ' . $org;
    $body = "New architectural review request\n\n"
        . "Name and title: $name\n"
        . "Organization: $org\n"
        . "Email: $email\n"
        . 'Deployment target: ' . line($in['target'] ?? '') . "\n"
        . 'Operational focus: ' . line($in['focus'] ?? '') . "\n"
        . 'Timeline: ' . line($in['timeline'] ?? '') . "\n\n"
        . "Message:\n" . block($in['msg'] ?? '') . "\n";
    $replyName = $name;
    $confirm = "Thank you for contacting ePrivacy-AI. A solutions architect will reply shortly to schedule your architectural review.\n\n"
        . 'We sign mutual NDAs before any deep architectural review.';
} elseif ($type === 'tco') {
    $domain = line($in['domain'] ?? '');
    if ($domain === '') {
        respond(422, ['ok' => false, 'error' => 'Please enter your institutional domain.']);
    }
    $scenario = json_decode(is_string($in['scenario'] ?? null) ? $in['scenario'] : '', true);
    $lines = '';
    if (is_array($scenario)) {
        foreach (['users' => 'Users', 'seat' => 'SaaS seat cost / month ($)', 'q' => 'Queries / user / day', 'mode' => 'Compute', 'saas' => 'SaaS annual cost ($)', 'ep' => 'ePrivacy-AI annual cost ($)', 'save' => 'Annual savings ($)'] as $k => $label) {
            if (isset($scenario[$k]) && is_scalar($scenario[$k])) {
                $lines .= "$label: " . line((string) $scenario[$k], 40) . "\n";
            }
        }
    }
    $subject = 'TCO summary request: ' . $domain;
    $body = "New TCO summary request\n\n"
        . "Email: $email\n"
        . "Institutional domain: $domain\n"
        . 'Timeline: ' . line($in['timeline'] ?? '') . "\n\n"
        . "Calculator scenario:\n" . ($lines ?: "(not provided)\n");
    $replyName = '';
    $confirm = "Thank you. We have received your request for a custom TCO summary and will send it to this address.";
} else {
    respond(400, ['ok' => false, 'error' => 'Unknown request type.']);
}

function newMailer(array $cfg): PHPMailer
{
    $m = new PHPMailer(true);
    $m->isSMTP();
    $m->Host = $cfg['smtp']['host'];
    $m->Port = (int) $cfg['smtp']['port'];
    $m->SMTPAuth = true;
    $m->Username = $cfg['smtp']['username'];
    $m->Password = $cfg['smtp']['password'];
    $m->SMTPSecure = $cfg['smtp']['secure'] === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
    $m->CharSet = 'UTF-8';
    $m->Timeout = 15;
    $m->setFrom($cfg['from_email'], $cfg['from_name']);
    return $m;
}

try {
    $mail = newMailer($cfg);
    $mail->addAddress($cfg['to_email']);
    $mail->addReplyTo($email, $replyName);
    $mail->isHTML(false);
    $mail->Subject = $subject;
    $mail->Body = $body . "\n---\nSent from the ePrivacy-AI website\nIP: $ip\n";
    $mail->send();
} catch (MailException $e) {
    error_log('send-mail.php: ' . $e->getMessage());
    respond(502, ['ok' => false, 'error' => 'We could not send your message. Please email ' . $cfg['to_email'] . ' directly.']);
}

if (!empty($cfg['send_confirmation'])) {
    try {
        $c = newMailer($cfg);
        $c->addAddress($email, $replyName);
        $c->isHTML(false);
        $c->Subject = 'We received your request: ePrivacy-AI';
        $c->Body = $confirm . "\n\nePrivacy-AI\n" . $cfg['to_email'] . "\n";
        $c->send();
    } catch (MailException $e) {
        error_log('send-mail.php confirmation: ' . $e->getMessage());
    }
}

respond(200, ['ok' => true]);
