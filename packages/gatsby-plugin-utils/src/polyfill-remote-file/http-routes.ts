import path from "path"
import fs from "fs-extra"
import { fetchRemoteFile } from "gatsby-core-utils/fetch-remote-file"
import { hasFeature } from "../has-feature"
import { ImageCDNUrlKeys } from "./utils/url-generator"
import { getFileExtensionFromMimeType } from "./utils/mime-type-helpers"
import { transformImage } from "./transform-images"

import type { Application } from "express"

export function polyfillImageServiceDevRoutes(app: Application): void {
  if (hasFeature(`image-cdn`)) {
    return
  }

  addImageRoutes(app)
}

export function addImageRoutes(app: Application): Application {
  app.get(`/_gatsby/file/:url/:filename`, async (req, res) => {
    const outputDir = path.join(
      global.__GATSBY?.root || process.cwd(),
      `public`,
      `_gatsby`,
      `file`
    )

    const filePath = await fetchRemoteFile({
      directory: outputDir,
      url: req.query[ImageCDNUrlKeys.URL] as string,
      name: req.params.filename,
    })
    fs.createReadStream(filePath).pipe(res)
  })

  app.get(`/_gatsby/image/:url/:params/:filename`, async (req, res) => {
    const { url, params, filename } = req.params
    const remoteUrl = decodeURIComponent(
      req.query[ImageCDNUrlKeys.URL] as string
    )
    const searchParams = new URLSearchParams(
      decodeURIComponent(req.query[ImageCDNUrlKeys.ARGS] as string)
    )

    const resizeParams: {
      width: number
      height: number
      quality: number
      format: string
    } = {
      width: 0,
      height: 0,
      quality: 75,
      format: ``,
    }

    for (const [key, value] of searchParams) {
      switch (key) {
        case `w`: {
          resizeParams.width = Number(value)
          break
        }
        case `h`: {
          resizeParams.height = Number(value)
          break
        }
        case `fm`: {
          resizeParams.format = value
          break
        }
        case `q`: {
          resizeParams.quality = Number(value)
          break
        }
      }
    }

    const outputDir = path.join(
      global.__GATSBY?.root || process.cwd(),
      `public`,
      `_gatsby`,
      `_image`,
      url,
      params
    )

    const filePath = await transformImage({
      outputDir,
      args: {
        url: remoteUrl,
        filename,
        ...resizeParams,
      },
    })

    res.setHeader(
      `content-type`,
      getFileExtensionFromMimeType(path.extname(filename))
    )

    fs.createReadStream(filePath).pipe(res)
  })

  return app
}
