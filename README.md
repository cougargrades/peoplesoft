# @cougargrades/peoplesoft

![Docker Image Version (latest by date)](https://img.shields.io/docker/v/cougargrades/peoplesoft?arch=amd64&sort=date)

A tool for scraping UH's PeopleSoft system for current registration info.

## Usage

- To install:

  `docker pull cougargrades/peoplesoft`

- To use, you must update the mount location:

  `docker run -d -p 1234:1234 -v c:/Users/foobar/Documents/config:/config cougargrades/peoplesoft --name peoplesoft`

- Update the `config.json` file located wherever you mounted it:

    ```
    {
      "Authentication": 
      {
        "PeopleSoftIDNumber": "123456",
        "PeopleSoftPassword": "hunter2"
      },
      "Courses": 
      [
        {
          "Subject": "COSC",
          "CatalogNumber": "3360",
          "SemesterCode": "2130",
          "DesiredSectionNumbers": []
        }
      ],
      "Telegram": 
      {
        "BotToken": "sadfsadfsd",
        "ChatId": "11111111"
      }
    }
    ```

- Once you've update the config file, restart the container:

  `docker restart peoplesoft`

## PeopleSoft Row Format

See [formats.md](doc/formats.md).