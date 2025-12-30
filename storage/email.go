package storage

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"os"
)

type EmailService struct {
	host     string
	port     string
	username string
	password string
	from     string
}

func NewEmailService() *EmailService {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	username := os.Getenv("SMTP_USERNAME")
	password := os.Getenv("SMTP_PASSWORD")
	from := os.Getenv("SMTP_FROM_EMAIL")

	if host == "" || port == "" || username == "" || password == "" || from == "" {
		fmt.Println("Missing email configuration - check SMTP environment variables")
		return nil
	}

	return &EmailService{
		host:     host,
		port:     port,
		username: username,
		password: password,
		from:     from,
	}
}

func (e *EmailService) SendEmail(to, subject, body string) error {
	// Configuration TLS
	tlsConfig := &tls.Config{
		InsecureSkipVerify: false,
		ServerName:         e.host,
	}

	// Connexion au serveur SMTP
	conn, err := tls.Dial("tcp", e.host+":"+e.port, tlsConfig)
	if err != nil {
		return fmt.Errorf("TLS connection error: %v", err)
	}
	defer conn.Close()

	// Create SMTP client
	client, err := smtp.NewClient(conn, e.host)
	if err != nil {
		return fmt.Errorf("SMTP client creation error: %v", err)
	}
	defer client.Quit()

	// Authentication
	auth := smtp.PlainAuth("", e.username, e.password, e.host)
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP authentication error: %v", err)
	}

	// Configure sender/recipient
	if err = client.Mail(e.from); err != nil {
		return fmt.Errorf("sender configuration error: %v", err)
	}
	if err = client.Rcpt(to); err != nil {
		return fmt.Errorf("recipient configuration error: %v", err)
	}

	// Write message
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("data writer error: %v", err)
	}
	defer writer.Close()

	// Message headers and body
	message := fmt.Sprintf("To: %s\r\n"+
		"From: %s\r\n"+
		"Subject: %s\r\n"+
		"Content-Type: text/html; charset=UTF-8\r\n"+
		"\r\n"+
		"%s\r\n", to, e.from, subject, body)

	_, err = writer.Write([]byte(message))
	if err != nil {
		return fmt.Errorf("message write error: %v", err)
	}

	fmt.Printf("Email sent successfully to %s (Subject: %s)\n", to, subject)
	return nil
}

func (e *EmailService) SendVerificationCode(to, code string) error {
	subject := "Code de vérification BabyCheck"
	body := fmt.Sprintf(`
		<h2>Vérification de votre adresse email</h2>
		<p>Votre code de vérification est :</p>
		<h1 style="color: #007bff; font-size: 32px; letter-spacing: 4px;">%s</h1>
		<p>Ce code expire dans 10 minutes.</p>
		<p>Si vous n'avez pas demandé cette vérification, ignorez cet email.</p>
	`, code)

	return e.SendEmail(to, subject, body)
}

func (e *EmailService) SendTestEmail(to string) error {
	subject := "Test BabyCheck - Email configuré avec succès"
	body := `
		<h2>🎉 Félicitations !</h2>
		<p>Votre service email BabyCheck fonctionne parfaitement.</p>
		<p>Amazon SES est configuré et prêt à envoyer des emails de vérification.</p>
		<p><strong>Prochaines étapes :</strong></p>
		<ul>
			<li>Ajout du champ email aux utilisateurs</li>
			<li>Système de codes de vérification</li>
			<li>Interface de gestion des emails</li>
		</ul>
		<hr>
		<small>Cet email a été envoyé depuis votre application BabyCheck via Amazon SES.</small>
	`

	return e.SendEmail(to, subject, body)
}

func (e *EmailService) SendPasswordResetLink(to, token string) error {
	subject := "Réinitialisation de votre mot de passe BabyCheck"
	
	// Get the base URL from environment or use default for development
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080" // Default for development
	}
	
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", baseURL, token)
	
	body := fmt.Sprintf(`
		<h2>Réinitialisation de votre mot de passe</h2>
		<p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte BabyCheck.</p>
		<p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
		<p><a href="%s" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Réinitialiser mon mot de passe</a></p>
		<p>Ou copiez ce lien dans votre navigateur :</p>
		<p style="word-break: break-all; font-family: monospace; background-color: #f5f5f5; padding: 8px; border-radius: 4px;">%s</p>
		<p><strong>Important :</strong></p>
		<ul>
			<li>Ce lien expire dans 5 minutes</li>
			<li>Il ne peut être utilisé qu'une seule fois</li>
			<li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
		</ul>
		<hr>
		<small>Cet email a été envoyé depuis votre application BabyCheck.</small>
	`, resetLink, resetLink)

	return e.SendEmail(to, subject, body)
}