provider "digitalocean" {
}

resource "digitalocean_droplet" "kamailio" {

  count              = 1
  ssh_keys           = ["${var.ssh_key_id}"]
  image              = "docker"
  region             = "nyc3"
  size               = "512mb"
  private_networking = true
  backups            = false
  ipv6               = false
  name               = "kamailio-${count.index}"
  tags               = ["${var.deployment_tag}"]

  provisioner "local-exec" {
    command = "./deploy.sh provision kamailio-${count.index}"
  }

}

resource "digitalocean_droplet" "janus" {

  count              = 1
  ssh_keys           = ["${var.ssh_key_id}"]
  image              = "docker"
  region             = "nyc3"
  size               = "512mb"
  private_networking = true
  backups            = false
  ipv6               = false
  name               = "janus-${count.index}"
  tags               = ["${var.deployment_tag}"]
  depends_on         = ["digitalocean_droplet.janus"]

  provisioner "local-exec" {
    command = "./deploy.sh provision janus-${count.index}"
  }

}

resource "digitalocean_droplet" "asterisk" {

  count              = 1
  ssh_keys           = ["${var.ssh_key_id}"]
  image              = "docker"
  region             = "nyc3"
  size               = "1gb"
  private_networking = true
  backups            = false
  ipv6               = false
  name               = "asterisk-${count.index}"
  tags               = ["${var.deployment_tag}"]
  depends_on         = ["digitalocean_droplet.kamailio"]

  provisioner "local-exec" {
    command = "./deploy.sh provision asterisk-${count.index}"
  }

}

resource "digitalocean_droplet" "api" {

  count              = 1
  ssh_keys           = ["${var.ssh_key_id}"]
  image              = "docker"
  region             = "nyc3"
  size               = "512mb"
  private_networking = true
  backups            = false
  ipv6               = false
  name               = "api-${count.index}"
  tags               = ["${var.deployment_tag}"]
  depends_on         = ["digitalocean_droplet.kamailio"]

  provisioner "local-exec" {
    command = "./deploy.sh provision api-${count.index}"
  }

}