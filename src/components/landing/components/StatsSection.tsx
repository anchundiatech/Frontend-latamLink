export default function StatsSection() {
  return (
    <section className="border-y border-border bg-white dark:bg-surface px-8 py-16">

      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 text-center">

        <div>
          <div className="font-heading text-6xl tracking-tight">
            7<span className="text-primary">%</span>
          </div>

          <p className="text-text-secondary mt-3">
            de comisión cobran bancos y procesadoras
          </p>
        </div>

        <div>
          <div className="font-heading text-6xl tracking-tight">
            &lt;3<span className="text-primary">s</span>
          </div>

          <p className="text-text-secondary mt-3">
            tarda tu pago en llegar
          </p>
        </div>

        <div>
          <div className="font-heading text-6xl tracking-tight">
            0<span className="text-primary"> SOL</span>
          </div>

          <p className="text-text-secondary mt-3">
            necesitas comprar
          </p>
        </div>

      </div>

    </section>
  )
}