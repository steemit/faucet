interface APIOptions {
  /** API server address without trailing slash (/) */
  address: string
  /** Oauth2 token. */
  token?: string
}

class APIError extends Error {
  public info?: any

  constructor(message: string, info?: any) {
    super(message)
    this.info = info
  }
}

export class API {
  /** If set will be called when the token expires. */
  public refresh?: (prevToken: string) => Promise<string>

  private token?: string

  constructor(private readonly options: APIOptions) {
    if (options.token) {
      this.setToken(options.token)
    }
  }

  public setToken(token: string) {
    this.token = token
  }

  /**
   * Make an API call.
   * @param path Endpoint, e.g. /get_things
   * @param payload Data to send, must be JSON serializable, optional.
   */
  public async call(path: string, payload?: any): Promise<any> {
    if (!this.token) {
      throw new APIError("Missing token")
    }
    const url = this.options.address + path
    const opts: RequestInit = {
      body: payload ? JSON.stringify(payload) : undefined,
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": this.token,
      },
      method: "POST",
    }
    const response = await fetch(url, opts)
    if (this.refresh && response.status === 412) {
      this.setToken(await this.refresh(this.token))
      return this.call(path, payload)
    }
    let responseData: any
    try {
      responseData = await response.json()
    } catch (error) {
      // tslint:disable-next-line
      console.warn("Unable to decode response data", error)
    }
    if (response.status !== 200) {
      const message =
        responseData && responseData.error
          ? responseData.error
          : `HTTP ${response.status}`
      throw new APIError(message, responseData)
    }
    return responseData
  }
}
