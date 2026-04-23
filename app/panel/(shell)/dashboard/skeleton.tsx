export function DashboardSkeleton() {
  return (
    <div className="px-8 py-10 max-w-[1200px] mx-auto">
      {/* Hero */}
      <div className="mb-10">
        <Shimmer w="140px" h="10px" mb={12} />
        <Shimmer w="380px" h="48px" mb={12} />
        <Shimmer w="320px" h="16px" />
      </div>

      {/* 4 metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[var(--r)] p-5"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              minHeight: 130,
            }}
          >
            <Shimmer w="80px" h="10px" mb={16} />
            <Shimmer w="120px" h="34px" mb={10} />
            <Shimmer w="90px" h="11px" />
          </div>
        ))}
      </div>

      {/* 2 column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div
          className="rounded-[var(--r)] p-6"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            minHeight: 260,
          }}
        >
          <Shimmer w="130px" h="10px" mb={8} />
          <Shimmer w="200px" h="22px" mb={20} />
          <Shimmer w="100%" h="140px" />
        </div>
        <div
          className="rounded-[var(--r)] p-6"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            minHeight: 260,
          }}
        >
          <Shimmer w="120px" h="10px" mb={8} />
          <Shimmer w="220px" h="22px" mb={20} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="mb-2.5">
              <Shimmer w="100%" h="13px" mb={6} />
              <Shimmer w="60%" h="4px" />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes aleg-shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
      `}</style>
    </div>
  );
}

function Shimmer({
  w,
  h,
  mb = 0,
}: {
  w: string;
  h: string;
  mb?: number;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        marginBottom: mb,
        borderRadius: 4,
        background:
          'linear-gradient(90deg, var(--paper-2) 0%, var(--card-2) 50%, var(--paper-2) 100%)',
        backgroundSize: '800px 100%',
        animation: 'aleg-shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
}
