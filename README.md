## Hackabeat

Never miss a hackatime beat, app for hackclubbers; know exactly when you started coding, how much time you would have made if you had been coding constantly since you started, how much you've actually recorded, and set up a reminder to work after X minutes of activity!

## How it works

To question how this works, we need to question how Hackatime works

Hackatime tracks time using heartbeats. Whenever you write some code, it uploads a heartbeat. If the time interval between two heartbeats is less than 5 minutes, Hackatime counts it as time spent coding. This app alerts the user if they spend more than 3 minutes idle, so that they can track more time.

(As far as I know, this is not against Hackatime policy, but if I'm wrong, please correct me)

## Deployment

Deploy over any static hosting like Github pages, or spin up a local server using:

`python -m http.server`

## Setup

When you go to the website, it would demand a hackatime api key, and username. 

Check your **username** at https://hackatime.hackclub.com/my/settings#user_username

Get your Hackatime Api Key, the one you setup your VSCode with, visible here https://hackatime.hackclub.com/my/settings/setup#user_config_file

A project by Muhammad Ali

:3