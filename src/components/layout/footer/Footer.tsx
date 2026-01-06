import { ThemeSwitcher } from '~/components/ui/theme-switcher'

import { FooterInfo } from './FooterInfo'

export const Footer = () => {
  return (
    <footer
      data-hide-print
      className={
        'relative z-[1] mt-32 border-t border-x-uk-separator-opaque-light bg-themed-bg_opacity py-6 text-base-content/80 [-webkit-backdrop-filter:saturate(180%)_blur(20px)] [backdrop-filter:saturate(180%)_blur(20px)] dark:border-uk-separator-opaque-dark'
      }
      style={{
        // keep a subtle semi-transparent feel similar to header
        opacity: 0.78,
      }}
    >
      <div className="px-4 sm:px-8">
        <div className="relative mx-auto max-w-7xl lg:px-8">
          <FooterInfo />

          <div className="mt-6 block text-center md:absolute md:bottom-0 md:right-0 md:mt-0">
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </footer>
  )
}
