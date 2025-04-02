declare module "color-thief-browser" {
  export default class ColorThief {
    static getColor(
      img: HTMLImageElement,
      quality?: number
    ): Promise<[number, number, number]>;
  }
}
