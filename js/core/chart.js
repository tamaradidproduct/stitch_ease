// ─────────────────────────────────────────────
// CHART RENDERER — SYMS, stitchCell, buildChartTracker
//
// Renders the knitting chart viewport, row tracker, zoom, and legend.
//
// Symbol artwork is the exact vector paths from this app's own Figma
// "Stitches" component set (mSct8t0TpsyYJad4teKfwl, node 1:258), kept in
// their native 24-unit cell box so each glyph's inset (e.g. the triangles
// span 4..20) is the designed padding rather than something re-derived
// here. Every svg is 100%x100% of its container, so one set of paths
// serves the chart (scales with --cell-sz), the legend and the notes
// sheet. `currentColor` replaces the export's hardcoded fill/stroke so
// the active-row color swap (.crow-active .cc-sym) keeps working.
// ─────────────────────────────────────────────
const SYMS = {
  P:   '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><rect x="8" y="8" width="8" height="8" rx="4" fill="currentColor" /></svg>',
  YO:  '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12.0001 17.7143C15.156 17.7143 17.7143 15.1559 17.7143 12C17.7143 8.84408 15.156 6.28571 12.0001 6.28571C8.84414 6.28571 6.28577 8.84408 6.28577 12C6.28577 15.1559 8.84414 17.7143 12.0001 17.7143Z" fill="currentColor" /></svg>',
  K2:  '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path d="M20 4V20H4L20 4Z" fill="currentColor" /></svg>',
  SK:  '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path d="M4 4V20H20L4 4Z" fill="currentColor" /></svg>',
  M1:  '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path d="M7.38477 4.47806V4.47903H7.38672C7.38835 4.47984 7.39133 4.48135 7.39453 4.48294C7.40094 4.48612 7.41056 4.49148 7.42285 4.49759C7.44775 4.50997 7.4844 4.5279 7.53125 4.5513C7.6256 4.59843 7.76217 4.66687 7.92969 4.7515C8.26463 4.9207 8.72451 5.15583 9.22559 5.41751C10.1988 5.92575 11.3316 6.53872 11.999 6.97318C12.7329 6.49387 13.8686 5.87939 14.8271 5.38138C15.3191 5.12575 15.7663 4.9004 16.0898 4.7388C16.2514 4.65811 16.3821 4.59298 16.4727 4.54837C16.5179 4.52609 16.5533 4.50929 16.5771 4.49759C16.5891 4.49174 16.5984 4.48692 16.6045 4.48392C16.6074 4.48249 16.6098 4.48173 16.6113 4.48099L16.6133 4.48001L16.709 4.43314L16.75 4.53079L17.2227 5.65677L17.2588 5.74368L17.1738 5.78568H17.1729L17.1719 5.78665C17.1706 5.78728 17.1686 5.78834 17.166 5.78958C17.1608 5.7921 17.1527 5.7954 17.1426 5.80032C17.1221 5.81024 17.0916 5.8253 17.0527 5.84427C16.975 5.88217 16.8625 5.93682 16.7236 6.0054C16.4454 6.14285 16.0606 6.33479 15.6357 6.55228C14.8368 6.96131 13.899 7.46106 13.2549 7.85892C14.279 8.63071 15.3451 9.56084 16.165 10.6411C17.0167 11.7633 17.6074 13.0524 17.6074 14.4947C17.6072 17.585 15.0967 20.0894 12 20.0894C8.90325 20.0894 6.3928 17.585 6.39258 14.4947C6.39258 13.0526 6.98335 11.7634 7.83496 10.6411C8.6543 9.56139 9.71884 8.63136 10.7422 7.85989C10.2488 7.56159 9.33357 7.07321 8.50781 6.64505C8.05834 6.412 7.63692 6.19637 7.32812 6.03958C7.17393 5.96129 7.04756 5.89723 6.95996 5.85306C6.91646 5.83112 6.88253 5.81392 6.85938 5.80228C6.84776 5.79644 6.83799 5.79258 6.83203 5.78958C6.82934 5.78823 6.82764 5.78641 6.82617 5.78568L6.82422 5.7847H6.82324L6.74023 5.74271L6.77637 5.65677L7.24805 4.52884L7.28906 4.43118L7.38477 4.47806ZM11.999 8.69876C11.0694 9.36548 10.0335 10.1885 9.22461 11.1509C8.39846 12.134 7.81641 13.2546 7.81641 14.4947C7.81663 16.7996 9.68926 18.6685 12 18.6685C14.3107 18.6685 16.1834 16.7996 16.1836 14.4947C16.1836 13.2546 15.6015 12.134 14.7754 11.1509C13.9662 10.188 12.929 9.36564 11.999 8.69876Z" fill="currentColor" stroke="currentColor" stroke-width="0.2" /></svg>',
  M1L: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path d="M18 21L18 3M4 3L17.9642 11.0623" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>',
  M1R: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path d="M6 21L6 3M6 11L19.9642 2.93774" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>',

  // Pulled from the same Figma "Stitches" set (node 1:258), added for Posy —
  // pattern-neutral additions to the shared symbol vocabulary, not specific
  // to any one pattern's chart code.
  K2A: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(1.000000,0.000000,0.000000,1.000000,3.999047,4.706157)" d="M-0.707107 13.8805C-1.09763 14.271 -1.09763 14.9042 -0.707107 15.2947C-0.316583 15.6852 0.316583 15.6852 0.707107 15.2947L0 14.5876L-0.707107 13.8805ZM15.2947 0.707107C15.6852 0.316583 15.6852 -0.316583 15.2947 -0.707107C14.9042 -1.09763 14.271 -1.09763 13.8805 -0.707107L14.5876 0L15.2947 0.707107ZM8.81076 5.98233C8.42024 5.59181 7.78708 5.59181 7.39655 5.98233C7.00603 6.37285 7.00603 7.00602 7.39655 7.39654L8.10366 6.68944L8.81076 5.98233ZM15.2948 15.2948C15.6853 15.6853 16.3185 15.6853 16.709 15.2948C17.0995 14.9043 17.0995 14.2711 16.709 13.8806L16.0019 14.5877L15.2948 15.2948ZM0 14.5876L0.707107 15.2947L15.2947 0.707107L14.5876 0L13.8805 -0.707107L-0.707107 13.8805L0 14.5876ZM8.10366 6.68944L7.39655 7.39654L15.2948 15.2948L16.0019 14.5877L16.709 13.8806L8.81076 5.98233L8.10366 6.68944Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  SKA: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(-1.000000,0.000000,0.000000,1.000000,20.000954,4.706157)" d="M-0.707107 13.8805C-1.09763 14.271 -1.09763 14.9042 -0.707107 15.2947C-0.316583 15.6852 0.316583 15.6852 0.707107 15.2947L0 14.5876L-0.707107 13.8805ZM15.2947 0.707107C15.6852 0.316583 15.6852 -0.316583 15.2947 -0.707107C14.9042 -1.09763 14.271 -1.09763 13.8805 -0.707107L14.5876 0L15.2947 0.707107ZM8.81076 5.98233C8.42024 5.59181 7.78708 5.59181 7.39655 5.98233C7.00603 6.37285 7.00603 7.00602 7.39655 7.39654L8.10366 6.68944L8.81076 5.98233ZM15.2948 15.2948C15.6853 15.6853 16.3185 15.6853 16.709 15.2948C17.0995 14.9043 17.0995 14.2711 16.709 13.8806L16.0019 14.5877L15.2948 15.2948ZM0 14.5876L0.707107 15.2947L15.2947 0.707107L14.5876 0L13.8805 -0.707107L-0.707107 13.8805L0 14.5876ZM8.10366 6.68944L7.39655 7.39654L15.2948 15.2948L16.0019 14.5877L16.709 13.8806L8.81076 5.98233L8.10366 6.68944Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  M1LP: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(1.000000,0.000000,0.000000,1.000000,2.999509,1.999536)" d="M15.0002 0.000412594C15.5524 0.000413109 16.0001 0.448158 16.0002 1.00041L16.0002 19.0004C16.0002 19.5527 15.5524 20.0004 15.0002 20.0004C14.448 20.0002 14.0002 19.5526 14.0002 19.0004L14.0002 9.66057L0.500155 1.86662L0.414218 1.81096C0.00334379 1.51448 -0.124749 0.948708 0.133944 0.500413C0.392785 0.0520879 0.947078 -0.120291 1.40934 0.0873267L1.50016 0.134202L14.0002 7.351L14.0002 1.00041C14.0002 0.448282 14.4481 0.000613166 15.0002 0.000412594Z" fill="currentColor" fill-rule="nonzero"/><path transform="matrix(1.000000,0.000000,0.000000,1.000000,2.999509,1.999536)" d="M4.00016 12.0004C5.65696 12.0005 7.00013 13.3436 7.00016 15.0004C7.00001 16.6571 5.65689 18.0004 4.00016 18.0004C2.34354 18.0002 1.0003 16.657 1.00016 15.0004C1.00018 13.3437 2.34347 12.0006 4.00016 12.0004Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  M1RP: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(1.000000,0.000000,0.000000,1.000000,5.000000,1.937292)" d="M14.4639 0.133967C14.942 -0.14202 15.5539 0.0221534 15.8301 0.500178C16.1062 0.978429 15.9421 1.59021 15.4639 1.86639L2 9.63983L2 19.0627C1.99987 19.6149 1.5522 20.0627 1 20.0627C0.447796 20.0627 0.000130949 19.6148 0 19.0627L0 1.06268C0.000153881 0.510524 0.44781 0.0626775 1 0.0626775C1.55219 0.0626775 1.99985 0.510524 2 1.06268L2 7.33026L14.4639 0.133967Z" fill="currentColor" fill-rule="nonzero"/><path transform="matrix(1.000000,0.000000,0.000000,1.000000,5.000000,1.937292)" d="M12 12.0627C13.6568 12.0627 15 13.4059 15 15.0627C14.9999 16.7194 13.6567 18.0626 12 18.0627C10.3432 18.0627 9.00014 16.7194 9 15.0627C9.00002 13.4058 10.3432 12.0627 12 12.0627Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  SK2PO: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(1.000000,0.000000,0.000000,1.000000,3.331784,2.699531)" d="M0.316115 0.270313C0.719114 -0.107316 1.35157 -0.086779 1.7292 0.316212L17.0661 16.6834C17.4435 17.0864 17.4231 17.7199 17.0202 18.0975C16.6173 18.4743 15.9846 18.4539 15.6071 18.0516L9.66865 11.7127L9.66865 17.6014C9.66841 18.1533 9.22062 18.6012 8.66865 18.6014C8.11652 18.6014 7.6689 18.1534 7.66865 17.6014L7.66865 11.7107L1.73018 18.0506C1.35266 18.4535 0.720122 18.4738 0.317092 18.0965C-0.0858553 17.7189 -0.106404 17.0864 0.271194 16.6834L7.29756 9.1834L0.270217 1.6834C-0.107348 1.28047 -0.0866765 0.647971 0.316115 0.270313Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  P3TOG: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(-1.000000,0.000000,0.000000,1.000000,20.668350,2.698939)" d="M0.316188 0.270122C0.719187 -0.107163 1.35174 -0.0868118 1.72927 0.316021L17.0662 16.6832C17.4437 17.0861 17.423 17.7196 17.0203 18.0973C16.6173 18.4744 15.9847 18.454 15.6072 18.0514L9.66775 11.7115L9.66775 17.6022C9.6674 18.1541 9.21982 18.6022 8.66775 18.6022C8.11583 18.602 7.6681 18.154 7.66775 17.6022L7.66775 11.7125L1.72927 18.0514C1.35163 18.454 0.719077 18.4747 0.316188 18.0973C-0.0866303 17.7198 -0.106933 17.0872 0.27029 16.6842L7.29763 9.18321L0.27029 1.68321C-0.107294 1.28021 -0.0867867 0.647743 0.316188 0.270122Z" fill="currentColor" fill-rule="nonzero"/><path transform="matrix(1.000000,0.000000,0.000000,1.000000,3.331987,2.698914)" d="M3 0C4.65682 4.08164e-05 6 1.34317 6 3C5.99986 4.65671 4.65673 5.99996 3 6C1.34323 6 0.000143986 4.65673 0 3C0 1.34315 1.34315 0 3 0Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  P3: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(-1.000000,0.000000,0.000000,1.000000,4.000000,4.000000)" d="M1 0C1 -0.552285 0.552285 -1 0 -1C-0.552285 -1 -1 -0.552285 -1 0L0 0L1 0ZM-1 16C-1 16.5523 -0.552285 17 0 17C0.552285 17 1 16.5523 1 16L0 16L-1 16ZM0 0L-1 0L-1 16L0 16L1 16L1 0L0 0Z" fill="currentColor" fill-rule="nonzero"/><path transform="matrix(-1.000000,0.000000,0.000000,1.000000,12.000000,4.000000)" d="M1 0C1 -0.552285 0.552285 -1 0 -1C-0.552285 -1 -1 -0.552285 -1 0L0 0L1 0ZM-1 16C-1 16.5523 -0.552285 17 0 17C0.552285 17 1 16.5523 1 16L0 16L-1 16ZM0 0L-1 0L-1 16L0 16L1 16L1 0L0 0Z" fill="currentColor" fill-rule="nonzero"/><path transform="matrix(-1.000000,0.000000,0.000000,1.000000,20.000000,4.000000)" d="M1 0C1 -0.552285 0.552285 -1 0 -1C-0.552285 -1 -1 -0.552285 -1 0L0 0L1 0ZM-1 16C-1 16.5523 -0.552285 17 0 17C0.552285 17 1 16.5523 1 16L0 16L-1 16ZM0 0L-1 0L-1 16L0 16L1 16L1 0L0 0Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  SSP: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(1.000000,0.000000,0.000000,1.000000,4.000000,4.000000)" d="M16 16L0 16L0 0L16 16Z" fill="currentColor" fill-rule="nonzero"/><path transform="matrix(1.000000,0.000000,0.000000,1.000000,4.000000,4.000000)" d="M13 0C14.6568 4.08164e-05 16 1.34317 16 3C15.9999 4.65671 14.6567 5.99996 13 6C11.3432 6 10.0001 4.65673 10 3C10 1.34315 11.3431 0 13 0Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  P2TOG: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(1.000000,0.000000,0.000000,1.000000,4.000000,4.000000)" d="M16 16L0 16L16 0L16 16Z" fill="currentColor" fill-rule="nonzero"/><path transform="matrix(1.000000,0.000000,0.000000,1.000000,4.000000,4.000000)" d="M3 0C4.65682 4.08164e-05 6 1.34317 6 3C5.99986 4.65671 4.65673 5.99996 3 6C1.34323 6 0.000143986 4.65673 0 3C0 1.34315 1.34315 0 3 0Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  KTBL: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(1.000000,0.000000,0.000000,-1.000000,6.492209,19.989716)" d="M9.79163 9.92635C9.79163 7.3811 7.4013 5.35826 5.50779 4.00711C3.61428 5.35826 1.22395 7.3811 1.22395 9.92635C1.22395 12.287 3.14189 14.2006 5.50779 14.2006C7.87369 14.2006 9.79163 12.287 9.79163 9.92635ZM11.0156 9.92635C11.0156 12.9614 8.54966 15.4218 5.50779 15.4218C2.46592 15.4218 0 12.9614 0 9.92635C0 7.09936 2.31661 4.85425 4.42886 3.28201C3.52053 2.70453 0.376111 1.1274 0.376111 1.1274L0.847843 0C0.847843 0 4.20052 1.65947 5.50779 2.52512C6.96041 1.56322 10.1653 0.0015901 10.1653 0.0015901L10.6379 1.1274C10.6379 1.1274 7.88139 2.45836 6.58592 3.28201C8.69853 4.85443 11.0156 7.09872 11.0156 9.92635Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  PTBL: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(1.000000,0.000000,0.000000,-1.000000,6.492209,19.989716)" d="M9.79163 9.92635C9.79163 7.3811 7.4013 5.35826 5.50779 4.00711C3.61428 5.35826 1.22395 7.3811 1.22395 9.92635C1.22395 12.287 3.14189 14.2006 5.50779 14.2006C7.87369 14.2006 9.79163 12.287 9.79163 9.92635ZM11.0156 9.92635C11.0156 12.9614 8.54966 15.4218 5.50779 15.4218C2.46592 15.4218 0 12.9614 0 9.92635C0 7.09936 2.31661 4.85425 4.42886 3.28201C3.52053 2.70453 0.376111 1.1274 0.376111 1.1274L0.847843 0C0.847843 0 4.20052 1.65947 5.50779 2.52512C6.96041 1.56322 10.1653 0.0015901 10.1653 0.0015901L10.6379 1.1274C10.6379 1.1274 7.88139 2.45836 6.58592 3.28201C8.69853 4.85443 11.0156 7.09872 11.0156 9.92635Z" fill="currentColor" fill-rule="nonzero"/><path transform="matrix(1.000000,0.000000,0.000000,1.000000,9.000000,7.310184)" d="M3 0C4.65682 4.08164e-05 6 1.34317 6 3C5.99986 4.65671 4.65673 5.99996 3 6C1.34323 6 0.000143986 4.65673 0 3C0 1.34315 1.34315 0 3 0Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  TK2TOG: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(1.000000,0.000000,0.000000,1.000000,3.999023,4.387884)" d="M-0.707106 14.5171C-1.09763 14.9076 -1.09763 15.5407 -0.707107 15.9313C-0.316583 16.3218 0.316582 16.3218 0.707106 15.9313L0 15.2242L-0.707106 14.5171ZM14.5876 0.636546L15.2947 1.34365L14.5876 0.636546ZM8.81076 6.61888C8.42024 6.22835 7.78708 6.22835 7.39655 6.61888C7.00603 7.0094 7.00603 7.64257 7.39655 8.03309L8.10366 7.32598L8.81076 6.61888ZM15.2948 15.9313C15.6853 16.3219 16.3185 16.3219 16.709 15.9313C17.0995 15.5408 17.0995 14.9076 16.709 14.5171L16.0019 15.2242L15.2948 15.9313ZM15.5317 4.70228L14.8565 3.96461L14.8565 3.96461L15.5317 4.70228ZM2.63553 0.81786C2.15132 0.552222 1.54346 0.729405 1.27782 1.21361C1.01218 1.69781 1.18936 2.30568 1.67357 2.57132L2.15455 1.69459L2.63553 0.81786ZM0 15.2242C0.707106 15.9313 0.707139 15.9312 0.707205 15.9312C0.707271 15.9311 0.70737 15.931 0.707501 15.9309C0.707765 15.9306 0.708157 15.9302 0.708683 15.9297C0.709732 15.9286 0.711304 15.9271 0.713392 15.925C0.717567 15.9208 0.723809 15.9146 0.732074 15.9063C0.748603 15.8898 0.773225 15.8651 0.805592 15.8328C0.870327 15.768 0.966046 15.6723 1.08998 15.5484C1.33785 15.3005 1.6986 14.9398 2.15007 14.4883C3.05302 13.5854 4.3189 12.3195 5.77064 10.8677C8.67412 7.96425 12.321 4.31735 15.2947 1.34365L14.5876 0.636546L13.8805 -0.0705604C10.9068 2.90314 7.25991 6.55004 4.35643 9.45352C2.90469 10.9053 1.63881 12.1711 0.735857 13.0741C0.284382 13.5256 -0.0763586 13.8863 -0.324231 14.1342C-0.448167 14.2581 -0.543886 14.3538 -0.608621 14.4186C-0.640988 14.4509 -0.66561 14.4756 -0.682139 14.4921C-0.690404 14.5003 -0.696646 14.5066 -0.700821 14.5108C-0.702909 14.5129 -0.70448 14.5144 -0.70553 14.5155C-0.706055 14.516 -0.706448 14.5164 -0.706712 14.5167C-0.706843 14.5168 -0.706942 14.5169 -0.707008 14.517C-0.707074 14.517 -0.707106 14.5171 0 15.2242ZM8.10366 7.32598L7.39655 8.03309L15.2948 15.9313L16.0019 15.2242L16.709 14.5171L8.81076 6.61888L8.10366 7.32598ZM14.5876 0.636546L15.2947 1.34365C15.6992 0.939198 15.8721 1.01099 15.8167 0.999513C15.7592 0.98759 15.8559 0.969379 15.9433 1.23549C16.1158 1.76113 16.0054 2.91307 14.8565 3.96461L15.5317 4.70228L16.2069 5.43995C17.826 3.95804 18.3045 2.01609 17.8435 0.611728C17.6141 -0.0871716 17.0885 -0.779423 16.2225 -0.95888C15.3587 -1.13789 14.5371 -0.727125 13.8805 -0.0705604L14.5876 0.636546ZM15.5317 4.70228L14.8565 3.96461C14.4541 4.33297 13.637 4.52928 12.3039 4.38089C11.0272 4.23877 9.53403 3.80887 8.07781 3.27502C6.6313 2.74474 5.26815 2.12954 4.26319 1.64469C3.76182 1.4028 3.35219 1.19462 3.069 1.0475C2.92746 0.973967 2.81765 0.915768 2.74392 0.876334C2.70707 0.856619 2.67924 0.841601 2.66099 0.831711C2.65187 0.826766 2.64514 0.823103 2.64087 0.820777C2.63874 0.819613 2.63722 0.818784 2.63633 0.818296C2.63588 0.818052 2.63559 0.817893 2.63546 0.81782C2.63539 0.817783 2.63541 0.817794 2.63537 0.817775C2.63543 0.817807 2.63553 0.81786 2.15455 1.69459C1.67357 2.57132 1.67374 2.57142 1.67396 2.57154C1.67409 2.57161 1.67434 2.57175 1.67459 2.57188C1.67509 2.57216 1.67575 2.57252 1.67657 2.57297C1.6782 2.57386 1.68047 2.5751 1.68335 2.57667C1.68912 2.57982 1.69738 2.58431 1.70806 2.5901C1.72942 2.60167 1.76045 2.61842 1.80062 2.63991C1.88096 2.68287 1.99787 2.74483 2.14699 2.82229C2.44511 2.97717 2.87254 3.19436 3.39414 3.44601C4.4351 3.94822 5.86148 4.59268 7.38942 5.15282C8.90765 5.70939 10.5739 6.20066 12.0827 6.36861C13.5352 6.53029 15.13 6.42557 16.2069 5.43995L15.5317 4.70228Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  TSSK: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(-1.000000,0.000000,0.000000,1.000000,21.008293,4.387884)" d="M-0.707106 14.5171C-1.09763 14.9076 -1.09763 15.5407 -0.707107 15.9313C-0.316583 16.3218 0.316582 16.3218 0.707106 15.9313L0 15.2242L-0.707106 14.5171ZM14.5876 0.636546L15.2947 1.34365L14.5876 0.636546ZM8.81076 6.61888C8.42024 6.22835 7.78708 6.22835 7.39655 6.61888C7.00603 7.0094 7.00603 7.64257 7.39655 8.03309L8.10366 7.32598L8.81076 6.61888ZM15.2948 15.9313C15.6853 16.3219 16.3185 16.3219 16.709 15.9313C17.0995 15.5408 17.0995 14.9076 16.709 14.5171L16.0019 15.2242L15.2948 15.9313ZM15.5317 4.70228L14.8565 3.96461L14.8565 3.96461L15.5317 4.70228ZM2.63553 0.81786C2.15132 0.552222 1.54346 0.729405 1.27782 1.21361C1.01218 1.69781 1.18936 2.30568 1.67357 2.57132L2.15455 1.69459L2.63553 0.81786ZM0 15.2242C0.707106 15.9313 0.707139 15.9312 0.707205 15.9312C0.707271 15.9311 0.70737 15.931 0.707501 15.9309C0.707765 15.9306 0.708157 15.9302 0.708683 15.9297C0.709732 15.9286 0.711304 15.9271 0.713392 15.925C0.717567 15.9208 0.723809 15.9146 0.732074 15.9063C0.748603 15.8898 0.773225 15.8651 0.805592 15.8328C0.870327 15.768 0.966046 15.6723 1.08998 15.5484C1.33785 15.3005 1.6986 14.9398 2.15007 14.4883C3.05302 13.5854 4.3189 12.3195 5.77064 10.8677C8.67412 7.96425 12.321 4.31735 15.2947 1.34365L14.5876 0.636546L13.8805 -0.0705604C10.9068 2.90314 7.25991 6.55004 4.35643 9.45352C2.90469 10.9053 1.63881 12.1711 0.735857 13.0741C0.284382 13.5256 -0.0763586 13.8863 -0.324231 14.1342C-0.448167 14.2581 -0.543886 14.3538 -0.608621 14.4186C-0.640988 14.4509 -0.66561 14.4756 -0.682139 14.4921C-0.690404 14.5003 -0.696646 14.5066 -0.700821 14.5108C-0.702909 14.5129 -0.70448 14.5144 -0.70553 14.5155C-0.706055 14.516 -0.706448 14.5164 -0.706712 14.5167C-0.706843 14.5168 -0.706942 14.5169 -0.707008 14.517C-0.707074 14.517 -0.707106 14.5171 0 15.2242ZM8.10366 7.32598L7.39655 8.03309L15.2948 15.9313L16.0019 15.2242L16.709 14.5171L8.81076 6.61888L8.10366 7.32598ZM14.5876 0.636546L15.2947 1.34365C15.6992 0.939198 15.8721 1.01099 15.8167 0.999513C15.7592 0.98759 15.8559 0.969379 15.9433 1.23549C16.1158 1.76113 16.0054 2.91307 14.8565 3.96461L15.5317 4.70228L16.2069 5.43995C17.826 3.95804 18.3045 2.01609 17.8435 0.611728C17.6141 -0.0871716 17.0885 -0.779423 16.2225 -0.95888C15.3587 -1.13789 14.5371 -0.727125 13.8805 -0.0705604L14.5876 0.636546ZM15.5317 4.70228L14.8565 3.96461C14.4541 4.33297 13.637 4.52928 12.3039 4.38089C11.0272 4.23877 9.53403 3.80887 8.07781 3.27502C6.6313 2.74474 5.26815 2.12954 4.26319 1.64469C3.76182 1.4028 3.35219 1.19462 3.069 1.0475C2.92746 0.973967 2.81765 0.915768 2.74392 0.876334C2.70707 0.856619 2.67924 0.841601 2.66099 0.831711C2.65187 0.826766 2.64514 0.823103 2.64087 0.820777C2.63874 0.819613 2.63722 0.818784 2.63633 0.818296C2.63588 0.818052 2.63559 0.817893 2.63546 0.81782C2.63539 0.817783 2.63541 0.817794 2.63537 0.817775C2.63543 0.817807 2.63553 0.81786 2.15455 1.69459C1.67357 2.57132 1.67374 2.57142 1.67396 2.57154C1.67409 2.57161 1.67434 2.57175 1.67459 2.57188C1.67509 2.57216 1.67575 2.57252 1.67657 2.57297C1.6782 2.57386 1.68047 2.5751 1.68335 2.57667C1.68912 2.57982 1.69738 2.58431 1.70806 2.5901C1.72942 2.60167 1.76045 2.61842 1.80062 2.63991C1.88096 2.68287 1.99787 2.74483 2.14699 2.82229C2.44511 2.97717 2.87254 3.19436 3.39414 3.44601C4.4351 3.94822 5.86148 4.59268 7.38942 5.15282C8.90765 5.70939 10.5739 6.20066 12.0827 6.36861C13.5352 6.53029 15.13 6.42557 16.2069 5.43995L15.5317 4.70228Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  CDD: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(1.000000,0.000000,0.000000,1.000000,3.014719,3.207102)" d="M7.60974 8.63173C7.805 8.82699 7.805 9.14357 7.60974 9.33883L4.23165 12.7169C4.03638 12.9122 3.7198 12.9122 3.52454 12.7169L0.146447 9.33883C-0.0488155 9.14357 -0.0488156 8.82699 0.146447 8.63173L3.52454 5.25364C3.7198 5.05837 4.03638 5.05837 4.23165 5.25364L7.60974 8.63173Z" fill="currentColor" fill-rule="nonzero"/><path transform="matrix(1.000000,0.000000,0.000000,1.000000,3.014719,3.207102)" d="M12.7169 13.7389C12.9122 13.9342 12.9122 14.2508 12.7169 14.446L9.33883 17.8241C9.14357 18.0194 8.82699 18.0194 8.63173 17.8241L5.25364 14.446C5.05837 14.2508 5.05838 13.9342 5.25364 13.7389L8.63173 10.3608C8.82699 10.1656 9.14357 10.1656 9.33883 10.3608L12.7169 13.7389Z" fill="currentColor" fill-rule="nonzero"/><path transform="matrix(1.000000,0.000000,0.000000,1.000000,3.014719,3.207102)" d="M12.7169 3.52454C12.9122 3.7198 12.9122 4.03638 12.7169 4.23165L9.33883 7.60974C9.14357 7.805 8.82699 7.805 8.63173 7.60974L5.25364 4.23165C5.05837 4.03638 5.05837 3.7198 5.25364 3.52454L8.63173 0.146446C8.82699 -0.0488154 9.14357 -0.0488156 9.33883 0.146446L12.7169 3.52454Z" fill="currentColor" fill-rule="nonzero"/><path transform="matrix(1.000000,0.000000,0.000000,1.000000,3.014719,3.207102)" d="M17.8241 8.63173C18.0194 8.82699 18.0194 9.14357 17.8241 9.33883L14.446 12.7169C14.2508 12.9122 13.9342 12.9122 13.7389 12.7169L10.3608 9.33883C10.1656 9.14357 10.1656 8.82699 10.3608 8.63173L13.7389 5.25364C13.9342 5.05837 14.2508 5.05837 14.446 5.25364L17.8241 8.63173Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  // "Pull up stitch" (drop-stitch, insert-3-rows-below move) is genuinely
  // taller than one cell in Figma — clipsContent:true confirms the frame is
  // meant to show only the anchor tip + the row-count label, with the rest
  // of the shape bleeding into the (unrendered, per-cell) rows above. The
  // <text> label isn't in fillGeometry (the API doesn't outline text glyphs
  // without an explicit request), so it's added here as a real <text> node
  // at the same position/size Figma reports for it.
  PU: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block;overflow:hidden"><path transform="matrix(-1.000000,0.000000,-0.000000,-1.000000,20.000000,92.000000)" d="M8 0L8.99589 -0.0905357C8.94907 -0.605615 8.5172 -1 8 -1C7.4828 -1 7.05093 -0.605615 7.00411 -0.0905357L8 0ZM15.0041 88.0905C15.0541 88.6405 15.5405 89.0459 16.0905 88.9959C16.6406 88.9459 17.0459 88.4595 16.9959 87.9095L16 88L15.0041 88.0905ZM-0.995893 87.9095C-1.04589 88.4595 -0.640552 88.9459 -0.0905357 88.9959C0.459481 89.0459 0.945892 88.6405 0.995893 88.0905L0 88L-0.995893 87.9095ZM8 0L7.00411 0.0905357L15.0041 88.0905L16 88L16.9959 87.9095L8.99589 -0.0905357L8 0ZM0 88L0.995893 88.0905L8.99589 0.0905357L8 0L7.00411 -0.0905357L-0.995893 87.9095L0 88Z" fill="currentColor" fill-rule="nonzero"/><text x="12" y="11.8" text-anchor="middle" dominant-baseline="central" font-size="12" font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif" fill="currentColor">3</text></svg>',
  GP: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(1.000000,0.000000,0.000000,1.000000,8.000000,8.000000)" d="M4 0C6.20914 0 8 1.79086 8 4C8 6.20914 6.20914 8 4 8C1.79086 8 0 6.20914 0 4C0 1.79086 1.79086 0 4 0ZM2.25879 6.44043C2.74999 6.79152 3.35019 7 4 7C5.65685 7 7 5.65685 7 4C7 3.35019 6.79152 2.74999 6.44043 2.25879L2.25879 6.44043ZM4 1C2.34315 1 1 2.34315 1 4C1 4.64581 1.20557 5.2429 1.55273 5.73242L5.73242 1.55273C5.2429 1.20557 4.64581 1 4 1Z" fill="currentColor" fill-rule="evenodd"/></svg>',
  BRK: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(1.000000,0.000000,0.000000,1.000000,4.000000,2.000000)" d="M8 0C12.4183 0 16 3.58172 16 8L16 20L14.5 20L14.5 7.9375L14.4961 7.9375C14.4098 4.42276 11.5355 1.59961 8 1.59961C4.46449 1.59961 1.59017 4.42276 1.50391 7.9375L1.5 7.9375L1.5 20L0 20L0 8C0 3.58172 3.58172 0 8 0Z" fill="currentColor" fill-rule="nonzero"/></svg>',
  BRP: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path transform="matrix(1.000000,0.000000,0.000000,1.000000,4.000000,2.000000)" d="M8 0C12.4183 0 16 3.58172 16 8L16 20L14.5 20L14.5 7.9375L14.4961 7.9375C14.4098 4.42276 11.5355 1.59961 8 1.59961C4.46449 1.59961 1.59017 4.42276 1.50391 7.9375L1.5 7.9375L1.5 20L0 20L0 8C0 3.58172 3.58172 0 8 0Z" fill="currentColor" fill-rule="nonzero"/><path transform="matrix(1.000000,0.000000,0.000000,1.000000,4.000000,2.000000)" d="M4 9C4 6.79086 5.79086 5 8 5C10.2091 5 12 6.79086 12 9C12 11.2091 10.2091 13 8 13C5.79086 13 4 11.2091 4 9Z" fill="currentColor" fill-rule="nonzero"/></svg>',
};

function stitchCell(type) {
  if (type === 'E') return '<div class="cc cc-e"></div>';
  const sym = SYMS[type] || '';
  return `<div class="cc">${sym ? `<span class="cc-sym">${sym}</span>` : ''}</div>`;
}

function buildChartTracker(phaseHeaderHtml) {
  let html = '<div class="chart-tracker">';

  // Top panel: just the phase header (minimized grab bar when idle) — the
  // general instructions now live in the row recap dock, and the zoom
  // controls sit next to the recenter FAB (see chart-stage below).
  html += `<div class="chart-overlay-top" id="chart-overlay-top">`;
  html += phaseHeaderHtml;
  html += '</div>';

  // Stage: the scrolling chart viewport + floating recenter/zoom buttons
  html += '<div class="chart-stage">';
  html += '<div class="chart-vp" id="chart-vp"><div class="chart-inner" id="chart-inner">';

  // Render rows top-to-bottom visually (row 44 at top, row 1 at bottom).
  // The last-worked row (44) carries the post-chart confirm step directly
  // underneath it, rather than as a separate block below the whole chart.
  for (let r = CHART_TOTAL; r >= 1; r--) {
    const rowData = CHART_B[r - 1];
    const isActive = (r === chartCurrentRow);
    const isDone   = (r < chartCurrentRow);

    let numCls = 'crow-num';
    if (isActive) numCls += ' crow-num-active';
    else if (isDone) numCls += ' crow-num-done';

    html += `<div class="crow${isActive ? ' crow-active' : ''}" data-row="${r}">`;
    html += '<div class="crow-cells">';
    for (const t of rowData) html += stitchCell(t);
    html += '</div>';
    html += `<div class="${numCls}">${r}</div>`;
    html += '</div>';
  }

  html += '</div></div>'; // chart-inner + chart-vp
  html += `<div class="chart-fabs">
    <button class="chart-fab-btn" onclick="resizeChart(2)" aria-label="Zoom in">A+</button>
    <button class="chart-fab-btn" onclick="resizeChart(-2)" aria-label="Zoom out">A−</button>
    <button class="chart-fab-btn chart-recenter" onclick="centerOnCurrentRow()" aria-label="Center on current row">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="3" fill="currentColor"/>
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M9 0.5V3M9 15v2.5M17.5 9H15M3 9H0.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>`;
  html += '</div>'; // chart-stage

  // Bottom panel: legend (kept for the pattern-notes sheet, hidden here)
  html += `<div class="chart-overlay-bottom" id="chart-overlay-bottom">`;
  html += `<div class="chart-legend">
    <div class="leg"><div class="leg-cc"></div>knit</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.P}</div>purl</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.YO}</div>yarn over</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.K2}</div>k2tog</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.SK}</div>SKPO</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.M1}</div>M1</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.M1L}</div>M1L</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.M1R}</div>M1R</div>
    <div class="leg"><div class="leg-cc leg-cc-e"></div>no stitch</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.K2A}</div>k2tog</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.SKA}</div>ssk</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.SSP}</div>ssp</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.P2TOG}</div>p2tog</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.KTBL}</div>ktbl</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.PTBL}</div>ptbl</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.TK2TOG}</div>tk2tog</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.TSSK}</div>tssk</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.CDD}</div>sl2-k1-p2sso</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.SK2PO}</div>skpo (sl1-k2tog-psso)</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.P3TOG}</div>p3tog</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.P3}</div>p3</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.M1LP}</div>m1lp</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.M1RP}</div>m1rp</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.PU}</div>pull up stitch</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.GP}</div>ghost purl</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.BRK}</div>brioche knit</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.BRP}</div>brioche purl</div>
  </div>`;
  html += '</div>';

  html += '</div>'; // chart-tracker
  return html;
}

function centerOnCurrentRow() {
  scrollChartToCurrent('smooth');
}

// ─────────────────────────────────────────────
// ROW RECAP — plain-language summary of the stitches in a row.
//
// Patterns worked IN THE ROUND (e.g. Peacock Tee) have only one kind of
// row: always read right → left, always the RS-facing stitch names. The
// stored chart array is left → right, so that case always reverses it.
//
// Patterns worked FLAT (`PHASES[cur].flatChart`, e.g. Frost Flower)
// alternate sides every row: odd rows are RS (right → left, RS stitch
// names), even rows are WS (left → right — the stored array is already
// left → right, so no reverse — WS stitch names). See isRSRow().
//
// `PHASES[cur].wsFirst` flips that parity — Posy's Chart 2 and back panel
// are explicit about it ("this time all odd rows are on WS"), so row 1
// there is WS, not RS. Everything else keeps the odd=RS default.
// ─────────────────────────────────────────────
const STITCH_ABBR_RS = {
  K: 'k', P: 'p', YO: 'yo', K2: 'k2tog', SK: 'ssk', M1: 'm1', M1L: 'M1L', M1R: 'M1R',
  // Posy's symbols are drawn RS/WS-specific already (separate chart cells,
  // not one glyph reinterpreted by side), so these read the same in both
  // maps rather than swapping.
  K2A: 'k2tog', SKA: 'ssk', M1LP: 'm1lp', M1RP: 'm1rp', SK2PO: 'sk2po',
  P3TOG: 'p3tog', P3: 'p3', SSP: 'ssp', P2TOG: 'p2tog', KTBL: 'ktbl', PTBL: 'ptbl',
  TK2TOG: 'tk2tog', TSSK: 'tssk', CDD: 'sl2-k1-p2sso', PU: 'pull up st',
  GP: 'ghost purl', BRK: 'brk', BRP: 'brp',
};
const STITCH_ABBR_WS = {
  K: 'p', P: 'k', YO: 'yo', K2: 'p2tog', SK: 'ssp', M1: 'm1', M1L: 'M1LP', M1R: 'M1RP',
  K2A: 'k2tog', SKA: 'ssk', M1LP: 'm1lp', M1RP: 'm1rp', SK2PO: 'sk2po',
  P3TOG: 'p3tog', P3: 'p3', SSP: 'ssp', P2TOG: 'p2tog', KTBL: 'ktbl', PTBL: 'ptbl',
  TK2TOG: 'tk2tog', TSSK: 'tssk', CDD: 'sl2-k1-p2sso', PU: 'pull up st',
  GP: 'ghost purl', BRK: 'brk', BRP: 'brp',
};

function isRSRow(row) {
  const phase = PHASES[cur];
  if (!(phase && phase.flatChart)) return true;
  const oddIsRS = !phase.wsFirst;
  return oddIsRS ? row % 2 === 1 : row % 2 === 0;
}

function rleStitches(types, abbr) {
  const out = [];
  for (let i = 0; i < types.length; ) {
    let j = i;
    while (j < types.length && types[j] === types[i]) j++;
    const n = j - i, t = types[i];
    if (t === 'K' || t === 'P') out.push(abbr[t] + n);
    else out.push(n > 1 ? abbr[t] + ' ×' + n : abbr[t]);
    i = j;
  }
  return out;
}

function collapseRepeats(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; ) {
    let best = null;
    const maxLen = Math.floor((tokens.length - i) / 2);
    for (let L = 2; L <= maxLen; L++) {
      let reps = 1;
      while (i + (reps + 1) * L <= tokens.length) {
        let match = true;
        for (let k = 0; k < L; k++) {
          if (tokens[i + k] !== tokens[i + reps * L + k]) { match = false; break; }
        }
        if (!match) break;
        reps++;
      }
      if (reps >= 2 && (!best || reps * L > best.reps * best.len)) best = { len: L, reps };
    }
    if (best) {
      out.push(`*${tokens.slice(i, i + best.len).join(', ')}* rep ${best.reps} times`);
      i += best.len * best.reps;
    } else {
      out.push(tokens[i]);
      i++;
    }
  }
  return out;
}

function rowRecap(row) {
  const rs = isRSRow(row);
  let types = CHART_B[row - 1].filter(t => t !== 'E');
  if (rs) types = types.reverse(); // RS: right → left. WS: already stored left → right.
  if (!types.length) return '';
  return collapseRepeats(rleStitches(types, rs ? STITCH_ABBR_RS : STITCH_ABBR_WS)).join(', ');
}

function recapHtml(row) {
  const flat = !!(PHASES[cur] && PHASES[cur].flatChart);
  const rs = isRSRow(row);
  // Row-specific only — state what's true for THIS row, not a general
  // rule covering both parities (flat patterns alternate RS/WS every row,
  // so a blanket "odd rows.../even rows..." statement makes the reader
  // work out which half applies to them; just say it directly instead).
  const headText = flat
    ? `Row ${row} (${rs ? 'RS' : 'WS'}) · read ${rs ? 'right → left' : 'left → right'}, bottom to top`
    : 'Work Chart B in the round · read right → left, bottom to top';
  let html = `<div class="recap-head">${headText}</div>
    <div class="recap-body"><strong>Row ${row}:</strong> ${rowRecap(row)}</div>`;

  // Post-chart confirm step — the last step of the chart phase, surfaced
  // alongside the row instructions (same "what do I do now" panel) rather
  // than as a separate block further down. Only relevant once the last row
  // is reached — it's the count you take after finishing the chart.
  const confirmEntry = (PHASES[cur].entries || []).find(e => e.postChart);
  if (confirmEntry && row === CHART_TOTAL) {
    const done = entryDone(confirmEntry, entryProg);
    html += `<div class="chart-confirm-step ${done ? 'done' : ''}" onclick="toggleEntry('${confirmEntry.id}')">
      <div class="step-circle">${CHECK_SVG}</div>
      <div class="step-text">${confirmEntry.text}</div>
    </div>`;
  }
  return html;
}

function renderChartDock() {
  const dock = document.getElementById('chart-dock');
  let html = `<div class="chart-recap" id="chart-recap">${recapHtml(chartCurrentRow)}</div>`;
  html += `<div class="chart-footer">
    <button class="cc-ctrl cc-minus" onclick="changeChartRow(-1)">−</button>
    <div class="cc-stats">
      <span class="cc-stat-lbl">Current row</span>
      <span class="cc-cur-val" id="cc-cur">${chartCurrentRow}</span>
      <span class="cc-total-lbl">Total rows ${CHART_TOTAL}</span>
    </div>
    <button class="cc-ctrl cc-plus" onclick="changeChartRow(1)">+</button>
  </div>`;

  html += '<div class="nav-btns" id="chart-nav-btns">';
  if (cur > 0) html += `<button class="nav-btn" onclick="go(${cur - 1})">← Back</button>`;
  if (cur < PHASES.length - 1) html += `<button class="nav-btn primary" onclick="go(${cur + 1})">Next →</button>`;
  else html += `<button class="nav-btn primary" onclick="showFinishedScreen()">Finished! 🎉</button>`;
  html += '</div>';

  dock.innerHTML = html;
}

// ─────────────────────────────────────────────
// CHART SCROLL — centre current row in viewport
// ─────────────────────────────────────────────
function getRowH() { return cellSz + 4; } // must match .crow height in CSS (var(--cell-sz) + 4px)

function scrollChartToCurrent(behavior) {
  // Centre the current row in the chart viewport. The viewport itself grows
  // and shrinks as the panels collapse/expand, so a plain centre is enough —
  // the visible area is always exactly the space left by the panels.
  const vp = document.getElementById('chart-vp');
  const inner = document.getElementById('chart-inner');
  if (!vp || !inner) return;

  const vpH = vp.clientHeight;
  const ROW_H = getRowH();
  const visIdx = CHART_TOTAL - chartCurrentRow; // row 44 = index 0 (top), row 1 = index 43 (bottom)
  const padTop = parseFloat(getComputedStyle(inner).paddingTop) || 8;
  const rowCenter = padTop + visIdx * ROW_H + ROW_H / 2;
  const target = rowCenter - vpH / 2;
  const maxScroll = inner.scrollHeight - vpH;

  vp.scrollTo({ top: Math.max(0, Math.min(maxScroll, target)), behavior: behavior || 'instant' });
}

function smartScrollChart(rowEl, delta) {
  // Keep the active row centered in the viewport once it reaches the midpoint
  // in the direction of travel.
  // Going up (+): track once row hits the upper half.
  // Going down (−): track once row hits the lower half.
  if (!rowEl) return;
  const vp = document.getElementById('chart-vp');
  if (!vp) return;

  const vpRect = vp.getBoundingClientRect();
  const rowRect = rowEl.getBoundingClientRect();
  const centerY = vpRect.top + vpRect.height / 2;
  const rowCenterY = rowRect.top + rowRect.height / 2;

  const shouldScroll = delta > 0 ? rowCenterY <= centerY : rowCenterY >= centerY;
  if (shouldScroll) {
    const target = vp.scrollTop + (rowCenterY - centerY);
    const maxScroll = vp.scrollHeight - vpRect.height;
    vp.scrollTo({ top: Math.max(0, Math.min(maxScroll, target)), behavior: 'smooth' });
  }
}

function resizeChart(delta) {
  cellSz = Math.max(10, Math.min(32, cellSz + delta));
  document.documentElement.style.setProperty('--cell-sz', cellSz + 'px');
  save();
  requestAnimationFrame(scrollChartToCurrent);
}

function changeChartRow(delta) {
  // The clamp lives in the model, beside the repeat's, because it IS the
  // repeat's: a chart is one pass with no inside, so advancing it is the same
  // operation minus the pass arithmetic. What stays here is the targeted DOM
  // update and the scroll — the parts that are genuinely the chart's own.
  const entry = chartEntryFor(PHASES[cur], activeDoc);
  if (!entry) return;
  const prevRow = chartCurrentRow;
  chartCurrentRow = advanceChartRow(entry, chartCurrentRow, delta);
  if (chartCurrentRow === prevRow) return; // clamped tap — nothing moved, nothing to stamp
  // Remember this phase's own position, so switching to another chart phase
  // and back returns to the row you were on rather than a shared one.
  if (PHASES[cur]) {
    chartRows[PHASES[cur].id] = chartCurrentRow;
    // Per-phase row means a per-phase clock. A single 'chart_row' key would
    // make two devices sitting on two different chart phases look like they
    // were fighting over one field, and merging them would move somebody to a
    // row of a chart they aren't knitting.
    stampClock(chartRowKey(PHASES[cur].id));
  }
  // No tally nudge here any more — the Rows total is derived from
  // chartRows/entryProg on read (globalRowsNow()), and save() stamps
  // global_rows if the derived value actually moved.
  renderGlobalRows();
  save();

  // Targeted DOM update — no full re-render
  const prevEl = document.querySelector('.crow[data-row="' + prevRow + '"]');
  if (prevEl) {
    prevEl.classList.remove('crow-active');
    const num = prevEl.querySelector('.crow-num');
    if (num) {
      num.classList.remove('crow-num-active');
      if (prevRow < chartCurrentRow) num.classList.add('crow-num-done');
      else num.classList.remove('crow-num-done');
    }
  }
  const newEl = document.querySelector('.crow[data-row="' + chartCurrentRow + '"]');
  if (newEl) {
    newEl.classList.add('crow-active');
    const num = newEl.querySelector('.crow-num');
    if (num) { num.classList.remove('crow-num-done'); num.classList.add('crow-num-active'); }
  }

  const ccur = document.getElementById('cc-cur');
  if (ccur) ccur.textContent = chartCurrentRow;
  const recap = document.getElementById('chart-recap');
  if (recap) recap.innerHTML = recapHtml(chartCurrentRow);

  // Smart scroll: keep active row centered once it reaches the viewport midpoint
  smartScrollChart(newEl, delta);
}

