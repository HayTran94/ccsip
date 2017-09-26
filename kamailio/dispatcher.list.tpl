{{range service "asterisk"}}1 sip:{{.Address}}:5060 0 0 weight=50
{{end}}